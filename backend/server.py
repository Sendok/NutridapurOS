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

from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)

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


def _rp(v):
    try:
        return 'Rp ' + f'{int(round(v)):,}'.replace(',', '.')
    except Exception:
        return 'Rp 0'


def build_sipgn_pdf(report: dict) -> bytes:
    """Bangun dokumen PDF laporan SIPGN/BGN yang rapi menggunakan reportlab."""
    GREEN = colors.HexColor('#16a34a')
    GREEN_DARK = colors.HexColor('#166534')
    GREEN_SOFT = colors.HexColor('#dcfce7')
    AMBER = colors.HexColor('#d97706')
    SLATE = colors.HexColor('#334155')
    SLATE_LIGHT = colors.HexColor('#f1f5f9')
    GREY = colors.HexColor('#64748b')

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title='Laporan SIPGN / BGN — NutriDapur OS',
        author='NutriDapur OS',
    )
    styles = getSampleStyleSheet()
    st_title = ParagraphStyle('t', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=18, textColor=GREEN_DARK, spaceAfter=2, leading=22)
    st_sub = ParagraphStyle('s', parent=styles['Normal'], fontSize=9.5, textColor=GREY, spaceAfter=2)
    st_h2 = ParagraphStyle('h2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, textColor=SLATE, spaceBefore=14, spaceAfter=6)
    st_body = ParagraphStyle('b', parent=styles['Normal'], fontSize=9.5, textColor=SLATE, leading=14)
    st_small = ParagraphStyle('sm', parent=styles['Normal'], fontSize=8, textColor=GREY, leading=11)
    st_cell = ParagraphStyle('c', parent=styles['Normal'], fontSize=8.5, textColor=SLATE, leading=11)
    st_cellr = ParagraphStyle('cr', parent=st_cell, alignment=TA_RIGHT)
    st_kpi_val = ParagraphStyle('kv', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=13, textColor=GREEN_DARK, alignment=TA_CENTER, leading=15)
    st_kpi_lbl = ParagraphStyle('kl', parent=styles['Normal'], fontSize=7.5, textColor=GREY, alignment=TA_CENTER, leading=9)

    elems = []
    rk = report['ringkasan']

    # ---------- Header banner ----------
    header_tbl = Table([[
        Paragraph('<b>NutriDapur&nbsp;OS</b>', ParagraphStyle('logo', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=15, textColor=colors.white)),
        Paragraph('LAPORAN OPERASIONAL SIPGN / BGN<br/><font size=7>Program Makan Bergizi Gratis (MBG)</font>', ParagraphStyle('hr', parent=styles['Normal'], fontSize=10, textColor=colors.white, alignment=TA_RIGHT, leading=13)),
    ]], colWidths=[70 * mm, 108 * mm])
    header_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GREEN),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    elems.append(header_tbl)
    elems.append(Spacer(1, 10))

    # ---------- Info satuan pelayanan ----------
    info_rows = [
        ['Satuan Pelayanan', report['satuan_pelayanan']],
        ['Tanggal Laporan', report['tanggal_laporan']],
        ['Dinyatakan Oleh', report['dinyatakan_oleh']],
        ['Format Dokumen', report['format']],
        ['Status Kepatuhan', 'PATUH' if rk['kepatuhan_anggaran_persen'] <= 100 else 'PERLU TINJAUAN'],
    ]
    info_tbl = Table([[Paragraph(f'<b>{k}</b>', st_small), Paragraph(str(v), st_body)] for k, v in info_rows], colWidths=[45 * mm, 133 * mm])
    info_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), SLATE_LIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#e2e8f0')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elems.append(info_tbl)

    # ---------- KPI ringkasan ----------
    elems.append(Paragraph('Ringkasan Periode', st_h2))
    kpis = [
        (f"{rk['total_porsi_periode']:,}".replace(',', '.'), 'Total Porsi'),
        (_rp(rk['total_anggaran']), 'Total Anggaran'),
        (_rp(rk['total_realisasi']), 'Total Realisasi'),
        (_rp(rk['rata_hpp_per_porsi']), 'HPP / Porsi'),
        (f"{rk['kepatuhan_anggaran_persen']}%", 'Kepatuhan Anggaran'),
        (f"{rk['rating_kepuasan_orang_tua']} / 5", f"Rating ({rk['jumlah_ulasan']} ulasan)"),
    ]
    kpi_cells = [[Paragraph(v, st_kpi_val), '', Paragraph(v2, st_kpi_val), '', Paragraph(v3, st_kpi_val)] for (v, _), (v2, _), (v3, _) in [(kpis[0], kpis[1], kpis[2])]]
    kpi_cells = [[Paragraph(v, st_kpi_val), '', Paragraph(v2, st_kpi_val), '', Paragraph(v3, st_kpi_val)] for (v, _), (v2, _), (v3, _) in [(kpis[0], kpis[1], kpis[2])]]
    # build 2 rows x 3 cols
    def kpi_block(items):


        row_vals = [Paragraph(x[0], st_kpi_val) for x in items]
        row_lbls = [Paragraph(x[1], st_kpi_lbl) for x in items]
        t = Table([row_vals, row_lbls], colWidths=[59 * mm] * 3)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), GREEN_SOFT),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
            ('LINEAFTER', (0, 0), (-2, -1), 3, colors.white),
            ('BOX', (0, 0), (-1, -1), 0.5, GREEN_SOFT),
        ]))
        return t
    elems.append(kpi_block(kpis[:3]))
    elems.append(Spacer(1, 3))
    elems.append(kpi_block(kpis[3:]))

    # ---------- Rincian harian ----------
    elems.append(Paragraph('Rincian Biaya Operasional Harian', st_h2))
    head = ['Tanggal', 'Porsi', 'Bahan Pangan', 'Gas/Listrik', 'Kemasan', 'Tng Kerja', 'HPP/Porsi', 'Margin']
    data_rows = [[Paragraph(f'<b>{h}</b>', ParagraphStyle('th', parent=st_cell, textColor=colors.white, alignment=TA_CENTER if i > 0 else TA_LEFT)) for i, h in enumerate(head)]]
    for f in report['rincian_harian']:
        data_rows.append([
            Paragraph(f"{f.get('hari','')}<br/><font size=7 color='#94a3b8'>{f.get('tanggal','')}</font>", st_cell),
            Paragraph(f"{f.get('porsi',0):,}".replace(',', '.'), st_cellr),
            Paragraph(_rp(f.get('bahan_pangan', 0)), st_cellr),
            Paragraph(_rp(f.get('gas_listrik', 0)), st_cellr),
            Paragraph(_rp(f.get('kemasan', 0)), st_cellr),
            Paragraph(_rp(f.get('tenaga_kerja', 0)), st_cellr),
            Paragraph(_rp(f.get('hpp_per_porsi', 0)), st_cellr),
            Paragraph(_rp(f.get('margin', 0)), st_cellr),
        ])
    # total row
    fin = report['rincian_harian']
    tot_porsi = sum(f.get('porsi', 0) for f in fin)
    tot_aktual = sum(f.get('aktual', 0) for f in fin)
    tot_margin = sum(f.get('margin', 0) for f in fin)
    data_rows.append([
        Paragraph('<b>TOTAL</b>', st_cell),
        Paragraph(f"<b>{tot_porsi:,}</b>".replace(',', '.'), st_cellr),
        Paragraph('', st_cellr), Paragraph('', st_cellr), Paragraph('', st_cellr),
        Paragraph(f'<b>{_rp(tot_aktual)}</b>', st_cellr),
        Paragraph(f"<b>{_rp(round(tot_aktual/max(tot_porsi,1)))}</b>", st_cellr),
        Paragraph(f'<b>{_rp(tot_margin)}</b>', st_cellr),
    ])
    colw = [26 * mm, 14 * mm, 24 * mm, 22 * mm, 20 * mm, 20 * mm, 24 * mm, 24 * mm]
    dt = Table(data_rows, colWidths=colw, repeatRows=1)
    dt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN_DARK),
        ('BACKGROUND', (0, -1), (-1, -1), SLATE_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8fafc')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, colors.HexColor('#e2e8f0')),
        ('LINEABOVE', (0, -1), (-1, -1), 0.8, GREEN),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elems.append(dt)

    # ---------- Menu terkunci ----------
    menu = report.get('menu_terkunci_hari_ini')
    if menu:
        elems.append(Paragraph('Menu Terkunci (Produksi Terkini)', st_h2))
        items = menu.get('items') or menu.get('menu_items') or []
        item_txt = ', '.join([i.get('nama', str(i)) if isinstance(i, dict) else str(i) for i in items]) if items else (menu.get('nama_menu') or menu.get('nama') or menu.get('tipe') or '—')
        gizi = menu.get('nutritional_info') or menu.get('gizi') or {}
        mbody = f"<b>{menu.get('nama_menu') or menu.get('nama') or menu.get('tipe') or 'Menu Harian'}</b> &nbsp;<font size=8 color='#d97706'>({menu.get('tipe','')})</font><br/>{item_txt}"
        if gizi:
            gtxt = ' &nbsp;|&nbsp; '.join([f"{k}: {v}" for k, v in list(gizi.items())[:5]])
            mbody += f"<br/><font size=8 color='#64748b'>{gtxt}</font>"
        mtbl = Table([[Paragraph(mbody, st_body)]], colWidths=[178 * mm])
        mtbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fffbeb')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#fde68a')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elems.append(mtbl)

    # ---------- Distribusi ----------
    deliveries = report.get('distribusi') or []
    if deliveries:
        elems.append(Paragraph('Distribusi ke Sekolah', st_h2))
        drows = [[Paragraph(f'<b>{h}</b>', ParagraphStyle('dh', parent=st_cell, textColor=colors.white)) for h in ['Sekolah', 'Jml Box', 'Status', 'Target Waktu']]]
        for d in deliveries[:12]:
            drows.append([
                Paragraph(str(d.get('sekolah') or d.get('school_name') or d.get('nama', '—')), st_cell),
                Paragraph(str(d.get('jumlah_box') or d.get('porsi') or '—'), st_cellr),
                Paragraph(str(d.get('status', '—')).replace('_', ' ').title(), st_cell),
                Paragraph(str(d.get('target_waktu') or d.get('target_time') or d.get('waktu') or '—'), st_cell),
            ])
        dtbl = Table(drows, colWidths=[80 * mm, 22 * mm, 40 * mm, 36 * mm], repeatRows=1)
        dtbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), GREEN_DARK),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        elems.append(dtbl)

    # ---------- QC ----------
    qc = report.get('qc_terakhir_approved')
    if qc:
        elems.append(Paragraph('Verifikasi Quality Control (QC) Terakhir', st_h2))
        chk = qc.get('checklist') or {}
        chk_txt = ', '.join([k.replace('_', ' ').title() for k, v in chk.items() if v]) or '—'
        qbody = (
            f"Status: <b>DISETUJUI</b> &nbsp;|&nbsp; Tanggal: {qc.get('tanggal','—')} {qc.get('waktu','')}<br/>"
            f"Lokasi: {qc.get('lokasi') or qc.get('location','—')}<br/>"
            f"Disetujui oleh: {qc.get('approved_by','—')}<br/>"
            f"Checklist Terpenuhi: {chk_txt}<br/>"
            f"<font size=8 color='#64748b'>{qc.get('catatan','')}</font>"
        )
        qtbl = Table([[Paragraph(qbody, st_body)]], colWidths=[178 * mm])
        qtbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), GREEN_SOFT),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#86efac')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elems.append(qtbl)

    # ---------- Footer / catatan ----------
    elems.append(Spacer(1, 14))
    elems.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e2e8f0')))
    elems.append(Spacer(1, 6))
    elems.append(Paragraph(report.get('catatan', ''), st_small))
    elems.append(Paragraph(f"Dokumen dihasilkan otomatis oleh NutriDapur OS • {report['tanggal_laporan']} • Mendukung standar BGN & SIPGN", st_small))

    def _footer(canvas, doc_):
        canvas.saveState()
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(GREY)
        canvas.drawRightString(A4[0] - 16 * mm, 10 * mm, f'Halaman {doc_.page}')
        canvas.drawString(16 * mm, 10 * mm, 'NutriDapur OS — Laporan SIPGN/BGN')
        canvas.setStrokeColor(colors.HexColor('#e2e8f0'))
        canvas.line(16 * mm, 13 * mm, A4[0] - 16 * mm, 13 * mm)
        canvas.restoreState()

    doc.build(elems, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue()


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
    await add_notification('Laporan SIPGN Diekspor', f"Laporan format SIPGN/BGN (PDF) berhasil diekspor oleh {user['nama']}.", 'success')
    pdf_bytes = build_sipgn_pdf(report)
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="laporan-sipgn-bgn-{today}.pdf"'},
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
