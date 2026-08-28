from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import uuid
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import httpx

from fallback_menus import FALLBACK_MENUS
from seed import seed_database, KITCHEN_NAME, QC_PHOTO_URL

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'nutridapur-dev-secret')
JWT_ALGO = 'HS256'
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
MODEL_ID = 'minimax/minimax-m3:free'
AI_TIMEOUT = 8

app = FastAPI(title='NutriDapur OS API')
api_router = APIRouter(prefix='/api')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('nutridapur')


# ================= Helpers =================
def _id():
    return str(uuid.uuid4())


def now_utc():
    return datetime.now(timezone.utc)


def serialize_doc(doc):
    """Recursively convert MongoDB doc to JSON-safe dict."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items() if k != '_id'}
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc


def create_token(user):
    payload = {
        'sub': user['id'],
        'email': user['email'],
        'role': user['role'],
        'nama': user['nama'],
        'exp': now_utc() + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Token tidak ditemukan. Silakan login.')
    token = authorization.split(' ', 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Sesi berakhir. Silakan login ulang.')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Token tidak valid.')
    user = await db.users.find_one({'id': payload['sub']}, {'_id': 0, 'password': 0})
    if not user:
        raise HTTPException(status_code=401, detail='Pengguna tidak ditemukan.')
    return user


def require_roles(*roles):
    async def checker(user=Depends(get_current_user)):
        if user['role'] not in roles:
            raise HTTPException(status_code=403, detail='Anda tidak memiliki akses ke fitur ini.')
        return user
    return checker


async def add_notification(judul, pesan, tipe='info'):
    await db.notifications.insert_one({
        'id': _id(), 'judul': judul, 'pesan': pesan, 'tipe': tipe,
        'read': False, 'created_at': now_utc().isoformat(),
    })


# ================= Models =================
class RegisterInput(BaseModel):
    nama: str
    email: str
    password: str
    role: str = 'admin'


class LoginInput(BaseModel):
    email: str
    password: str


class MenuGenInput(BaseModel):
    budget_per_porsi: int = 15000
    porsi_target: int = 500
    age_group: str = 'SD'
    bahan_lokal: List[str] = []


class LockMenuInput(BaseModel):
    menu: Dict[str, Any]
    age_group: str = 'SD'
    porsi_target: int = 500
    budget_per_porsi: int = 15000


class VendorInput(BaseModel):
    nama: str
    wa: str
    kategori: str
    pasar: str = 'Pasar Sukajadi'


class POInput(BaseModel):
    vendor_id: str
    items: List[Dict[str, Any]]
    tanggal_kirim: str
    total: int


class QCUploadInput(BaseModel):
    photo: str  # base64 or URL
    checklist: Dict[str, bool]
    catatan: str = ''
    lokasi: str = 'Dapur SP Sukajadi (-6.8915, 107.5893)'


class DeliveryInput(BaseModel):
    sekolah: str
    kelas: str = ''
    jumlah_box: int
    target_waktu: str
    driver: str = ''


class DeliveryStatusInput(BaseModel):
    status: str  # in_kitchen | on_delivery | delivered


class FeedbackInput(BaseModel):
    rasa: int
    porsi: int
    kesegaran: int
    tags: List[str] = []
    catatan: str = ''
    sekolah: str = 'SD Negeri 1 Sukajadi'
    kelas: str = 'Kelas 3B'


# ================= Startup =================
@app.on_event('startup')
async def on_startup():
    seeded = await seed_database(db)
    if seeded:
        logger.info('Database seeded with demo data.')


@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()


# ================= Auth =================
@api_router.post('/auth/register')
async def register(data: RegisterInput):
    if data.role not in ['admin', 'gizi', 'sekolah']:
        raise HTTPException(status_code=400, detail='Role tidak valid.')
    existing = await db.users.find_one({'email': data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail='Email sudah terdaftar. Silakan login.')
    role_labels = {'admin': 'Admin Dapur / Vendor', 'gizi': 'Ahli Gizi / Auditor', 'sekolah': 'Pihak Sekolah / Guru'}
    user = {
        'id': _id(),
        'nama': data.nama,
        'email': data.email.lower(),
        'password': bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode(),
        'role': data.role,
        'role_label': role_labels[data.role],
        'dapur': KITCHEN_NAME,
        'created_at': now_utc().isoformat(),
    }
    await db.users.insert_one(dict(user))
    user.pop('password')
    user.pop('_id', None)
    return {'token': create_token(user), 'user': serialize_doc(user)}


@api_router.post('/auth/login')
async def login(data: LoginInput):
    user = await db.users.find_one({'email': data.email.lower()})
    if not user or not bcrypt.checkpw(data.password.encode(), user['password'].encode()):
        raise HTTPException(status_code=401, detail='Email atau password salah.')
    user.pop('password')
    user.pop('_id', None)
    return {'token': create_token(user), 'user': serialize_doc(user)}


@api_router.get('/auth/me')
async def me(user=Depends(get_current_user)):
    return serialize_doc(user)


# ================= AI Menu Generator =================
def build_ai_prompt(budget, porsi, age_group, bahan):
    bahan_str = ', '.join(bahan) if bahan else 'Ayam, Tempe, Tahu, Telur, Bayam, Pisang'
    return f"""Anda adalah ahli gizi program Makan Bergizi Gratis (MBG) Indonesia yang mengikuti standar BGN.
Buat 3 opsi menu makan siang untuk anak {age_group} dengan budget maksimal Rp {budget} per porsi untuk {porsi} porsi.
Prioritaskan bahan lokal pasar tradisional: {bahan_str}.

WAJIB balas HANYA dengan JSON valid (tanpa markdown, tanpa penjelasan) dengan struktur PERSIS:
{{
  "menus": [
    {{
      "tipe": "Ekonomis",
      "nama_menu": "string",
      "deskripsi": "string singkat",
      "items": [{{"nama": "string dengan gramasi", "harga": number}}],
      "total_biaya": number,
      "gizi": {{"kalori": number, "protein_g": number, "karbohidrat_g": number, "lemak_g": number}},
      "mikronutrien": ["Vitamin A", "Zat Besi"],
      "alergen": ["string"],
      "bebas_alergen": ["string"],
      "bgn_compliant": true
    }},
    {{"tipe": "Seimbang", ...struktur sama}},
    {{"tipe": "High-Protein", ...struktur sama}}
  ]
}}
Semua harga Rupiah, total_biaya wajib <= {budget}. Menu harus memenuhi standar 4 Bintang BGN (karbohidrat, protein hewani, protein nabati, sayur/buah)."""


def extract_json(text):
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1:
        raise ValueError('No JSON found in AI response')
    return json.loads(text[start:end + 1])


async def call_openrouter(budget, porsi, age_group, bahan):
    headers = {
        'Authorization': f'Bearer {OPENROUTER_API_KEY}',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nutridapur.id',
        'X-Title': 'NutriDapur OS',
    }
    payload = {
        'model': MODEL_ID,
        'messages': [{'role': 'user', 'content': build_ai_prompt(budget, porsi, age_group, bahan)}],
        'temperature': 0.7,
        'max_tokens': 2500,
    }
    async with httpx.AsyncClient(timeout=AI_TIMEOUT) as ac:
        resp = await ac.post(OPENROUTER_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        content = data['choices'][0]['message']['content']
        return extract_json(content)


@api_router.post('/ai/generate-menu')
async def generate_menu(data: MenuGenInput, user=Depends(require_roles('admin', 'gizi'))):
    age_group = data.age_group if data.age_group in FALLBACK_MENUS else 'SD'
    fallback_used = False
    menus = []
    try:
        result = await call_openrouter(data.budget_per_porsi, data.porsi_target, age_group, data.bahan_lokal)
        menus = result.get('menus', [])
        if not menus or len(menus) < 3:
            raise ValueError('AI response incomplete')
        # sanity-fill missing fields
        for m in menus:
            m.setdefault('deskripsi', '')
            m.setdefault('mikronutrien', [])
            m.setdefault('alergen', [])
            m.setdefault('bebas_alergen', [])
            m.setdefault('bgn_compliant', m.get('total_biaya', 0) <= data.budget_per_porsi)
    except Exception as e:
        logger.warning(f'OpenRouter fallback triggered: {type(e).__name__}: {e}')
        menus = FALLBACK_MENUS[age_group]
        fallback_used = True
    return {
        'menus': serialize_doc(menus),
        'fallback_used': fallback_used,
        'age_group': age_group,
        'porsi_target': data.porsi_target,
        'budget_per_porsi': data.budget_per_porsi,
    }


@api_router.post('/menus/lock')
async def lock_menu(data: LockMenuInput, user=Depends(require_roles('admin', 'gizi'))):
    today = now_utc().strftime('%Y-%m-%d')
    menu = dict(data.menu)
    menu.update({
        'id': _id(),
        'tanggal': today,
        'age_group': data.age_group,
        'porsi_target': data.porsi_target,
        'budget_per_porsi': data.budget_per_porsi,
        'status': 'locked',
        'waktu_masak': '05:30 WIB',
        'waktu_kirim': '08:30 WIB',
        'batas_konsumsi': '12:00 WIB',
        'locked_by': user['nama'],
        'created_at': now_utc().isoformat(),
    })
    # replace existing locked menu for today
    await db.menus.delete_many({'tanggal': today})
    await db.menus.insert_one(dict(menu))
    await add_notification('Menu Hari Ini Terkunci', f"Menu '{menu.get('nama_menu', '-')}' dikunci oleh {user['nama']} untuk produksi.", 'success')
    return serialize_doc(menu)


@api_router.get('/menus/today')
async def get_today_menu():
    today = now_utc().strftime('%Y-%m-%d')
    menu = await db.menus.find_one({'tanggal': today, 'status': 'locked'}, {'_id': 0})
    if not menu:
        menu = await db.menus.find_one({'status': 'locked'}, {'_id': 0}, sort=[('created_at', -1)])
    return serialize_doc(menu)


# ================= Procurement =================
@api_router.get('/procurement/shopping-list')
async def shopping_list(user=Depends(require_roles('admin'))):
    today = now_utc().strftime('%Y-%m-%d')
    menu = await db.menus.find_one({'tanggal': today, 'status': 'locked'}, {'_id': 0})
    if not menu:
        menu = await db.menus.find_one({'status': 'locked'}, {'_id': 0}, sort=[('created_at', -1)])
    if not menu:
        return {'menu': None, 'shopping_list': []}
    porsi = menu.get('porsi_target', 500)
    mapping = [
        ('Nasi', 'Beras Premium', 0.11, 'kg', 12000, 'Sembako & Beras'),
        ('Ayam', 'Ayam Potong Segar', 0.075, 'kg', 35000, 'Ayam & Daging'),
        ('Lele', 'Ikan Lele Segar', 0.09, 'kg', 25000, 'Ikan & Seafood'),
        ('Tempe', 'Tempe Papan', 0.045, 'kg', 12000, 'Sembako & Beras'),
        ('Tahu', 'Tahu Putih', 0.05, 'kg', 10000, 'Sembako & Beras'),
        ('Telur', 'Telur Ayam Negeri', 0.06, 'kg', 28000, 'Ayam & Daging'),
        ('Bayam', 'Bayam Segar', 0.05, 'kg', 8000, 'Sayur & Buah'),
        ('Kangkung', 'Kangkung Segar', 0.05, 'kg', 6000, 'Sayur & Buah'),
        ('Wortel', 'Wortel', 0.02, 'kg', 12000, 'Sayur & Buah'),
        ('Buncis', 'Buncis', 0.03, 'kg', 10000, 'Sayur & Buah'),
        ('Pisang', 'Pisang Ambon', 0.1, 'sisir (est)', 20000, 'Sayur & Buah'),
        ('Jeruk', 'Jeruk Manis', 0.08, 'kg', 15000, 'Sayur & Buah'),
        ('Semangka', 'Semangka', 0.08, 'kg', 8000, 'Sayur & Buah'),
        ('Pepaya', 'Pepaya', 0.08, 'kg', 9000, 'Sayur & Buah'),
    ]
    items_text = ' '.join([i.get('nama', '') for i in menu.get('items', [])])
    result = []
    for keyword, nama_pasar, per_porsi, satuan, harga_satuan, kategori in mapping:
        if keyword.lower() in items_text.lower():
            qty = round(per_porsi * porsi, 1)
            result.append({
                'bahan': nama_pasar,
                'qty': qty,
                'satuan': satuan,
                'harga_satuan': harga_satuan,
                'subtotal': int(qty * harga_satuan),
                'kategori': kategori,
            })
    # bumbu & minyak selalu ada
    result.append({'bahan': 'Bumbu Dapur Lengkap', 'qty': 1, 'satuan': 'paket', 'harga_satuan': int(porsi * 400), 'subtotal': int(porsi * 400), 'kategori': 'Sembako & Beras'})
    result.append({'bahan': 'Minyak Goreng', 'qty': round(porsi * 0.008, 1), 'satuan': 'liter', 'harga_satuan': 16000, 'subtotal': int(porsi * 0.008 * 16000), 'kategori': 'Sembako & Beras'})
    return {'menu': serialize_doc(menu), 'shopping_list': result, 'total': sum(i['subtotal'] for i in result)}


@api_router.get('/procurement/vendors')
async def get_vendors(user=Depends(require_roles('admin'))):
    vendors = await db.vendors.find({}, {'_id': 0}).to_list(100)
    return serialize_doc(vendors)


@api_router.post('/procurement/vendors')
async def create_vendor(data: VendorInput, user=Depends(require_roles('admin'))):
    vendor = data.model_dump()
    vendor['id'] = _id()
    vendor['created_at'] = now_utc().isoformat()
    await db.vendors.insert_one(dict(vendor))
    return serialize_doc(vendor)


@api_router.post('/procurement/po')
async def create_po(data: POInput, user=Depends(require_roles('admin'))):
    vendor = await db.vendors.find_one({'id': data.vendor_id}, {'_id': 0})
    if not vendor:
        raise HTTPException(status_code=404, detail='Vendor tidak ditemukan.')
    po = {
        'id': _id(),
        'tanggal': now_utc().strftime('%Y-%m-%d'),
        'vendor_nama': vendor['nama'],
        'vendor_wa': vendor['wa'],
        'items': data.items,
        'total': data.total,
        'tanggal_kirim': data.tanggal_kirim,
        'status': 'sent',
        'created_at': now_utc().isoformat(),
    }
    await db.purchase_orders.insert_one(dict(po))
    await add_notification('PO WhatsApp Terkirim', f"PO ke {vendor['nama']} senilai Rp {data.total:,} telah dibuat dan dikirim via WhatsApp.".replace(',', '.'), 'success')
    return serialize_doc(po)


@api_router.get('/procurement/pos')
async def get_pos(user=Depends(require_roles('admin'))):
    pos = await db.purchase_orders.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return serialize_doc(pos)


# ================= QC =================
@api_router.post('/qc/upload')
async def qc_upload(data: QCUploadInput, user=Depends(require_roles('admin', 'gizi'))):
    qc = {
        'id': _id(),
        'tanggal': now_utc().strftime('%Y-%m-%d'),
        'waktu': now_utc().strftime('%H:%M') + ' WIB',
        'photo': data.photo,
        'lokasi': data.lokasi,
        'checklist': data.checklist,
        'catatan': data.catatan,
        'status': 'pending',
        'approved_by': None,
        'uploaded_by': user['nama'],
        'created_at': now_utc().isoformat(),
    }
    await db.qc_logs.insert_one(dict(qc))
    await add_notification('Foto QC Baru Diunggah', f"{user['nama']} mengunggah foto QC baru. Menunggu persetujuan Ahli Gizi.", 'info')
    return serialize_doc(qc)


@api_router.get('/qc/logs')
async def qc_logs(user=Depends(require_roles('admin', 'gizi', 'sekolah'))):
    logs = await db.qc_logs.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return serialize_doc(logs)


@api_router.post('/qc/{qc_id}/approve')
async def qc_approve(qc_id: str, user=Depends(require_roles('gizi', 'admin'))):
    qc = await db.qc_logs.find_one({'id': qc_id})
    if not qc:
        raise HTTPException(status_code=404, detail='Log QC tidak ditemukan.')
    await db.qc_logs.update_one({'id': qc_id}, {'$set': {'status': 'approved', 'approved_by': user['nama']}})
    await add_notification('Foto QC Hari Ini Approved', f"QC disetujui oleh {user['nama']}. Status: Siap Distribusi.", 'success')
    updated = await db.qc_logs.find_one({'id': qc_id}, {'_id': 0})
    return serialize_doc(updated)


@api_router.post('/qc/{qc_id}/reject')
async def qc_reject(qc_id: str, user=Depends(require_roles('gizi', 'admin'))):
    qc = await db.qc_logs.find_one({'id': qc_id})
    if not qc:
        raise HTTPException(status_code=404, detail='Log QC tidak ditemukan.')
    await db.qc_logs.update_one({'id': qc_id}, {'$set': {'status': 'rejected', 'approved_by': user['nama']}})
    await add_notification('QC Perlu Perbaikan', f"QC ditolak oleh {user['nama']}. Mohon perbaiki dan unggah ulang.", 'warning')
    updated = await db.qc_logs.find_one({'id': qc_id}, {'_id': 0})
    return serialize_doc(updated)


# ================= Deliveries =================
@api_router.get('/deliveries')
async def get_deliveries(user=Depends(require_roles('admin', 'gizi', 'sekolah'))):
    deliveries = await db.deliveries.find({}, {'_id': 0}).sort('created_at', -1).to_list(200)
    return serialize_doc(deliveries)


@api_router.post('/deliveries')
async def create_delivery(data: DeliveryInput, user=Depends(require_roles('admin'))):
    delivery = data.model_dump()
    delivery.update({
        'id': _id(),
        'tanggal': now_utc().strftime('%Y-%m-%d'),
        'status': 'in_kitchen',
        'created_at': now_utc().isoformat(),
    })
    await db.deliveries.insert_one(dict(delivery))
    return serialize_doc(delivery)


@api_router.patch('/deliveries/{delivery_id}/status')
async def update_delivery_status(delivery_id: str, data: DeliveryStatusInput, user=Depends(require_roles('admin', 'sekolah'))):
    if data.status not in ['in_kitchen', 'on_delivery', 'delivered']:
        raise HTTPException(status_code=400, detail='Status tidak valid.')
    delivery = await db.deliveries.find_one({'id': delivery_id})
    if not delivery:
        raise HTTPException(status_code=404, detail='Pengiriman tidak ditemukan.')
    await db.deliveries.update_one({'id': delivery_id}, {'$set': {'status': data.status}})
    status_label = {'in_kitchen': 'Di Dapur', 'on_delivery': 'Dalam Pengiriman', 'delivered': 'Terkirim'}[data.status]
    await add_notification('Status Pengiriman Diperbarui', f"Pengiriman ke {delivery['sekolah']} sekarang: {status_label}.", 'info')
    updated = await db.deliveries.find_one({'id': delivery_id}, {'_id': 0})
    return serialize_doc(updated)


# ================= Public Parent Portal =================
@api_router.get('/public/parent-portal')
async def parent_portal():
    today = now_utc().strftime('%Y-%m-%d')
    menu = await db.menus.find_one({'tanggal': today, 'status': 'locked'}, {'_id': 0})
    if not menu:
        menu = await db.menus.find_one({'status': 'locked'}, {'_id': 0}, sort=[('created_at', -1)])
    qc = await db.qc_logs.find_one({'status': 'approved'}, {'_id': 0}, sort=[('created_at', -1)])
    feedbacks = await db.feedback.find({}, {'_id': 0}).to_list(1000)
    avg_rating = round(sum(f.get('rating_avg', 0) for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0
    return {
        'sekolah': 'SD Negeri 1 Sukajadi',
        'kelas': 'Kelas 3B',
        'dapur': KITCHEN_NAME,
        'tanggal': today,
        'menu': serialize_doc(menu),
        'qc': serialize_doc(qc),
        'total_ulasan': len(feedbacks),
        'rating_rata': avg_rating,
    }


@api_router.post('/public/feedback')
async def submit_feedback(data: FeedbackInput):
    for v in [data.rasa, data.porsi, data.kesegaran]:
        if v < 1 or v > 5:
            raise HTTPException(status_code=400, detail='Rating harus antara 1-5 bintang.')
    fb = {
        'id': _id(),
        'tanggal': now_utc().strftime('%Y-%m-%d'),
        'sekolah': data.sekolah,
        'kelas': data.kelas,
        'rasa': data.rasa,
        'porsi': data.porsi,
        'kesegaran': data.kesegaran,
        'rating_avg': round((data.rasa + data.porsi + data.kesegaran) / 3, 1),
        'tags': data.tags,
        'catatan': data.catatan,
        'created_at': now_utc().isoformat(),
    }
    await db.feedback.insert_one(dict(fb))
    await add_notification('Ulasan Baru dari Orang Tua', f"Ulasan baru masuk dari {data.sekolah} dengan rating {fb['rating_avg']}\u2605.", 'info')
    return serialize_doc(fb)


@api_router.get('/feedback')
async def get_feedback(user=Depends(require_roles('admin', 'gizi', 'sekolah'))):
    feedbacks = await db.feedback.find({}, {'_id': 0}).sort('created_at', -1).to_list(200)
    return serialize_doc(feedbacks)


# ================= Dashboard =================
@api_router.get('/dashboard/summary')
async def dashboard_summary(user=Depends(get_current_user)):
    today = now_utc().strftime('%Y-%m-%d')
    deliveries = await db.deliveries.find({'tanggal': today}, {'_id': 0}).to_list(200)
    total_porsi = sum(d.get('jumlah_box', 0) for d in deliveries)
    financials = await db.financials.find({}, {'_id': 0}).sort('tanggal', 1).to_list(30)
    hpp_avg = round(sum(f['hpp_per_porsi'] for f in financials) / len(financials)) if financials else 0
    feedbacks = await db.feedback.find({}, {'_id': 0}).to_list(1000)
    rating = round(sum(f.get('rating_avg', 0) for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0
    qc_today = await db.qc_logs.find_one({'tanggal': today, 'status': 'approved'}, {'_id': 0})
    menu_today = await db.menus.find_one({'tanggal': today, 'status': 'locked'}, {'_id': 0})
    sipgn_ready = bool(qc_today and menu_today)
    # skor gizi: dari menu compliance + qc
    skor_gizi = 98 if (menu_today and menu_today.get('bgn_compliant')) else 85
    chart_budget = [
        {'hari': f.get('hari', ''), 'tanggal': f['tanggal'][5:], 'budget': f['budget'], 'aktual': f['aktual']}
        for f in financials[-7:]
    ]
    gizi = (menu_today or {}).get('gizi', {'kalori': 520, 'protein_g': 21, 'karbohidrat_g': 68, 'lemak_g': 14})
    chart_gizi = [
        {'name': 'Karbohidrat', 'value': gizi.get('karbohidrat_g', 0), 'satuan': 'g'},
        {'name': 'Protein', 'value': gizi.get('protein_g', 0), 'satuan': 'g'},
        {'name': 'Lemak', 'value': gizi.get('lemak_g', 0), 'satuan': 'g'},
    ]
    unread = await db.notifications.count_documents({'read': False})
    return {
        'total_porsi_hari_ini': total_porsi,
        'hpp_per_porsi': hpp_avg,
        'target_hpp': 15000,
        'skor_gizi': skor_gizi,
        'rating_orang_tua': rating,
        'total_ulasan': len(feedbacks),
        'sipgn_ready': sipgn_ready,
        'chart_budget': chart_budget,
        'chart_gizi': chart_gizi,
        'kalori_menu': gizi.get('kalori', 0),
        'unread_notifications': unread,
        'menu_today': serialize_doc(menu_today),
    }


# ================= Notifications =================
@api_router.get('/notifications')
async def get_notifications(user=Depends(get_current_user)):
    notifs = await db.notifications.find({}, {'_id': 0}).sort('created_at', -1).to_list(50)
    return serialize_doc(notifs)


@api_router.post('/notifications/{notif_id}/read')
async def read_notification(notif_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one({'id': notif_id}, {'$set': {'read': True}})
    return {'ok': True}


@api_router.post('/notifications/read-all')
async def read_all_notifications(user=Depends(get_current_user)):
    await db.notifications.update_many({}, {'$set': {'read': True}})
    return {'ok': True}


# ================= Finance & SIPGN Export =================
@api_router.get('/finance/pnl')
async def finance_pnl(user=Depends(require_roles('admin'))):
    financials = await db.financials.find({}, {'_id': 0}).sort('tanggal', -1).to_list(30)
    total_budget = sum(f['budget'] for f in financials)
    total_actual = sum(f['aktual'] for f in financials)
    total_porsi = sum(f['porsi'] for f in financials)
    return {
        'rows': serialize_doc(financials),
        'total_budget': total_budget,
        'total_aktual': total_actual,
        'total_margin': total_budget - total_actual,
        'total_porsi': total_porsi,
        'margin_persen': round((total_budget - total_actual) / total_budget * 100, 1) if total_budget else 0,
        'hpp_rata': round(total_actual / total_porsi) if total_porsi else 0,
        'budget_compliance': round(total_actual / total_budget * 100, 1) if total_budget else 0,
    }


@api_router.get('/reports/sipgn-export')
async def sipgn_export(user=Depends(require_roles('admin'))):
    today = now_utc().strftime('%Y-%m-%d')
    financials = await db.financials.find({}, {'_id': 0}).sort('tanggal', 1).to_list(30)
    menu = await db.menus.find_one({'status': 'locked'}, {'_id': 0}, sort=[('created_at', -1)])
    qc = await db.qc_logs.find_one({'status': 'approved'}, {'_id': 0}, sort=[('created_at', -1)])
    deliveries = await db.deliveries.find({}, {'_id': 0}).to_list(200)
    feedbacks = await db.feedback.find({}, {'_id': 0}).to_list(1000)
    rating = round(sum(f.get('rating_avg', 0) for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0
    report = {
        'format': 'LAPORAN_SIPGN_BGN_V1',
        'sistem': 'NutriDapur OS',
        'tanggal_laporan': today,
        'satuan_pelayanan': KITCHEN_NAME,
        'ringkasan': {
            'total_porsi_periode': sum(f['porsi'] for f in financials),
            'total_anggaran': sum(f['budget'] for f in financials),
            'total_realisasi': sum(f['aktual'] for f in financials),
            'rata_hpp_per_porsi': round(sum(f['aktual'] for f in financials) / max(sum(f['porsi'] for f in financials), 1)),
            'kepatuhan_anggaran_persen': round(sum(f['aktual'] for f in financials) / max(sum(f['budget'] for f in financials), 1) * 100, 1),
            'rating_kepuasan_orang_tua': rating,
            'jumlah_ulasan': len(feedbacks),
        },
        'menu_terkunci_hari_ini': serialize_doc(menu),
        'qc_terakhir_approved': serialize_doc(qc),
        'distribusi': serialize_doc(deliveries),
        'rincian_harian': serialize_doc(financials),
        'dinyatakan_oleh': user['nama'],
        'catatan': 'Laporan ini dihasilkan otomatis oleh NutriDapur OS dalam format siap unggah SIPGN/BGN.',
    }
    await add_notification('Laporan SIPGN Diekspor', f"Laporan format SIPGN/BGN berhasil diekspor oleh {user['nama']}.", 'success')
    content = json.dumps(report, ensure_ascii=False, indent=2)
    return Response(
        content=content,
        media_type='application/json',
        headers={'Content-Disposition': f'attachment; filename="laporan-sipgn-{today}.json"'},
    )


# ================= Landing metrics (public) =================
@api_router.get('/public/impact-metrics')
async def impact_metrics():
    financials = await db.financials.find({}, {'_id': 0}).to_list(30)
    total_porsi = sum(f['porsi'] for f in financials) if financials else 8750
    return {
        'porsi_terdistribusi': total_porsi,
        'kepatuhan_gizi': 98,
        'hemat_waktu': 70,
        'dapur_aktif': 12,
    }


@api_router.get('/')
async def root():
    return {'message': 'NutriDapur OS API - Siap Melayani Dapur MBG Indonesia'}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)
