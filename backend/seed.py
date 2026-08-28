"""Seeder data mock realistis 5-7 hari operasional Dapur SP MBG Katering Sukajadi."""
import uuid
import random
from datetime import datetime, timedelta, timezone

import bcrypt

KITCHEN_NAME = "Dapur SP MBG Katering Sukajadi"
QC_PHOTO_URL = "https://images.unsplash.com/photo-1609710219624-201223bd6b1e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def _id():
    return str(uuid.uuid4())


async def seed_database(db):
    existing = await db.users.find_one({"email": "admin@nutridapur.id"})
    if existing:
        return False

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")

    # ===== Users (demo accounts) =====
    users = [
        {"id": _id(), "nama": "Budi Santoso", "email": "admin@nutridapur.id", "password": hash_pw("demo123"),
         "role": "admin", "role_label": "Admin Dapur / Vendor", "dapur": KITCHEN_NAME, "created_at": now.isoformat()},
        {"id": _id(), "nama": "Dr. Sari Nutrisia, S.Gz", "email": "gizi@nutridapur.id", "password": hash_pw("demo123"),
         "role": "gizi", "role_label": "Ahli Gizi / Auditor", "dapur": KITCHEN_NAME, "created_at": now.isoformat()},
        {"id": _id(), "nama": "Ibu Ratna Dewi, S.Pd", "email": "sekolah@nutridapur.id", "password": hash_pw("demo123"),
         "role": "sekolah", "role_label": "Pihak Sekolah / Guru", "dapur": "SD Negeri 1 Sukajadi", "created_at": now.isoformat()},
    ]
    await db.users.insert_many(users)

    # ===== 7 hari data finansial (chart budget vs aktual) =====
    day_names = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    financials = []
    porsi_base = 1250
    for i in range(6, -1, -1):
        d = now - timedelta(days=i)
        porsi = porsi_base + random.choice([-50, 0, 25, 50, 75])
        budget = porsi * 15000
        bahan = int(budget * random.uniform(0.58, 0.65))
        gas = int(budget * random.uniform(0.05, 0.07))
        kemasan = int(budget * random.uniform(0.06, 0.08))
        tenaga = int(budget * random.uniform(0.13, 0.16))
        actual = bahan + gas + kemasan + tenaga
        financials.append({
            "id": _id(),
            "tanggal": d.strftime("%Y-%m-%d"),
            "hari": day_names[d.weekday()],
            "porsi": porsi,
            "budget": budget,
            "aktual": actual,
            "bahan_pangan": bahan,
            "gas_listrik": gas,
            "kemasan": kemasan,
            "tenaga_kerja": tenaga,
            "hpp_per_porsi": round(actual / porsi),
            "margin": budget - actual,
            "created_at": d.isoformat(),
        })
    await db.financials.insert_many(financials)

    # ===== Menu terkunci hari ini =====
    locked_menu = {
        "id": _id(),
        "tanggal": today,
        "tipe": "Seimbang",
        "nama_menu": "Nasi Ayam Goreng Lengkuas Set",
        "deskripsi": "Menu seimbang 4 Bintang: karbohidrat, protein hewani & nabati, sayur, dan buah.",
        "age_group": "SD",
        "porsi_target": 1250,
        "budget_per_porsi": 15000,
        "items": [
            {"nama": "Nasi Putih (150g)", "harga": 2500},
            {"nama": "Ayam Goreng Lengkuas (70g)", "harga": 6000},
            {"nama": "Tempe Bacem (40g)", "harga": 1500},
            {"nama": "Cah Bayam Wortel (70g)", "harga": 2500},
            {"nama": "Pisang Ambon (1 buah)", "harga": 1500},
            {"nama": "Air Mineral Gelas", "harga": 500},
        ],
        "total_biaya": 14500,
        "gizi": {"kalori": 520, "protein_g": 21, "karbohidrat_g": 68, "lemak_g": 14},
        "mikronutrien": ["Vitamin A", "Vitamin C", "Kalsium", "Zat Besi"],
        "alergen": ["Kedelai (Tempe)", "Ayam"],
        "bebas_alergen": ["Kacang Tanah", "Seafood"],
        "bgn_compliant": True,
        "status": "locked",
        "waktu_masak": "05:30 WIB",
        "waktu_kirim": "08:30 WIB",
        "batas_konsumsi": "12:00 WIB",
        "locked_by": "Budi Santoso",
        "created_at": now.isoformat(),
    }
    await db.menus.insert_one(locked_menu)

    # ===== Vendor pasar =====
    vendors = [
        {"id": _id(), "nama": "Bu Siti (Lapak Sayur Segar)", "wa": "6281234567801", "kategori": "Sayur & Buah", "pasar": "Pasar Sukajadi", "created_at": now.isoformat()},
        {"id": _id(), "nama": "Pak Budi (Ayam Potong Barokah)", "wa": "6281234567802", "kategori": "Ayam & Daging", "pasar": "Pasar Sukajadi", "created_at": now.isoformat()},
        {"id": _id(), "nama": "Bu Rina (Toko Sembako Makmur)", "wa": "6281234567803", "kategori": "Sembako & Beras", "pasar": "Pasar Sukajadi", "created_at": now.isoformat()},
        {"id": _id(), "nama": "Pak Joko (Lapak Ikan Segar)", "wa": "6281234567804", "kategori": "Ikan & Seafood", "pasar": "Pasar Sukajadi", "created_at": now.isoformat()},
    ]
    await db.vendors.insert_many(vendors)

    # ===== PO history (2 hari lalu terkirim) =====
    pos = []
    for i in [2, 1]:
        d = now - timedelta(days=i)
        pos.append({
            "id": _id(),
            "tanggal": d.strftime("%Y-%m-%d"),
            "vendor_nama": "Pak Budi (Ayam Potong Barokah)",
            "vendor_wa": "6281234567802",
            "items": [{"nama": "Ayam Potong Segar", "qty": "90 kg", "harga": 3150000}],
            "total": 3150000,
            "tanggal_kirim": d.strftime("%Y-%m-%d"),
            "status": "sent",
            "created_at": d.isoformat(),
        })
    await db.purchase_orders.insert_many(pos)

    # ===== QC Logs (5 hari, hari ini approved dengan foto) =====
    qc_logs = []
    for i in range(4, 0, -1):
        d = now - timedelta(days=i)
        qc_logs.append({
            "id": _id(),
            "tanggal": d.strftime("%Y-%m-%d"),
            "waktu": "06:10 WIB",
            "photo": QC_PHOTO_URL,
            "lokasi": "Dapur SP Sukajadi (-6.8915, 107.5893)",
            "checklist": {"higienis": True, "suhu": True, "gizi_4_bintang": True, "uji_rasa": True},
            "catatan": "Semua parameter QC terpenuhi. Porsi sesuai standar BGN.",
            "status": "approved",
            "approved_by": "Dr. Sari Nutrisia, S.Gz",
            "uploaded_by": "Budi Santoso",
            "created_at": d.isoformat(),
        })
    qc_today = {
        "id": _id(),
        "tanggal": today,
        "waktu": "06:15 WIB",
        "photo": QC_PHOTO_URL,
        "lokasi": "Dapur SP Sukajadi (-6.8915, 107.5893)",
        "checklist": {"higienis": True, "suhu": True, "gizi_4_bintang": True, "uji_rasa": True},
        "catatan": "Foto porsi nyata sebelum pengiriman. Suhu penyajian 65\u00b0C, higienitas terjaga.",
        "status": "approved",
        "approved_by": "Dr. Sari Nutrisia, S.Gz",
        "uploaded_by": "Budi Santoso",
        "created_at": now.isoformat(),
    }
    qc_logs.append(qc_today)
    await db.qc_logs.insert_many(qc_logs)

    # ===== Deliveries hari ini =====
    schools = [
        ("SD Negeri 1 Sukajadi", "Kelas 1-6", 320, "09:00", "delivered"),
        ("SD Negeri 2 Sukajadi", "Kelas 1-6", 280, "09:15", "delivered"),
        ("SMP Negeri 1 Sukajadi", "Kelas 7-9", 350, "09:30", "on_delivery"),
        ("SD Islam Al-Hidayah", "Kelas 1-6", 180, "09:45", "on_delivery"),
        ("SMA Negeri 1 Sukajadi", "Kelas 10-12", 120, "10:00", "in_kitchen"),
    ]
    deliveries = []
    for nama, kelas, box, target, status in schools:
        deliveries.append({
            "id": _id(),
            "tanggal": today,
            "sekolah": nama,
            "kelas": kelas,
            "jumlah_box": box,
            "target_waktu": f"{target} WIB",
            "status": status,
            "driver": random.choice(["Pak Asep", "Pak Dedi", "Pak Ujang"]),
            "created_at": now.isoformat(),
        })
    await db.deliveries.insert_many(deliveries)

    # ===== Feedback orang tua (data historis) =====
    feedback_samples = [
        (5, 5, 5, ["Anak Suka!", "Porsi Pas"], "Alhamdulillah anak saya lahap makannya, terima kasih dapur MBG!"),
        (4, 5, 4, ["Lauk Segar", "Kemasan Rapi"], "Ayamnya empuk, anak suka. Semoga konsisten."),
        (5, 4, 5, ["Anak Suka!", "Lauk Segar"], ""),
        (4, 4, 4, ["Porsi Pas"], "Porsinya pas untuk anak kelas 3."),
        (5, 5, 4, ["Anak Suka!", "Kemasan Rapi"], "Kemasannya rapi dan bersih."),
        (4, 3, 4, ["Lauk Segar"], "Mungkin sayurnya bisa lebih bervariasi."),
        (5, 5, 5, ["Anak Suka!", "Porsi Pas", "Lauk Segar"], "Menu hari ini favorit anak saya!"),
        (4, 4, 5, ["Kemasan Rapi"], ""),
    ]
    feedbacks = []
    for idx, (rasa, porsi, segar, tags, catatan) in enumerate(feedback_samples):
        d = now - timedelta(days=random.randint(0, 4), hours=random.randint(1, 8))
        feedbacks.append({
            "id": _id(),
            "tanggal": d.strftime("%Y-%m-%d"),
            "sekolah": "SD Negeri 1 Sukajadi",
            "kelas": "Kelas 3B",
            "rasa": rasa,
            "porsi": porsi,
            "kesegaran": segar,
            "rating_avg": round((rasa + porsi + segar) / 3, 1),
            "tags": tags,
            "catatan": catatan,
            "created_at": d.isoformat(),
        })
    await db.feedback.insert_many(feedbacks)

    # ===== Notifikasi awal =====
    notifications = [
        {"id": _id(), "judul": "Foto QC Hari Ini Approved", "pesan": "Ahli Gizi telah menyetujui foto QC pukul 06:15 WIB. Status: Siap Distribusi.", "tipe": "success", "read": False, "created_at": now.isoformat()},
        {"id": _id(), "judul": "Laporan Siap Diunggah ke SIPGN", "pesan": "Laporan operasional harian sudah lengkap dan siap diekspor ke format SIPGN/BGN.", "tipe": "info", "read": False, "created_at": (now - timedelta(minutes=30)).isoformat()},
        {"id": _id(), "judul": "PO WhatsApp ke Pasar Belum Dikirim", "pesan": "PO belanja bahan untuk besok belum dikirim ke vendor pasar. Segera kirim sebelum 16:00 WIB.", "tipe": "warning", "read": False, "created_at": (now - timedelta(hours=1)).isoformat()},
        {"id": _id(), "judul": "Ulasan Baru dari Orang Tua", "pesan": "3 ulasan baru masuk dari orang tua SD Negeri 1 Sukajadi. Rating rata-rata 4.6\u2605.", "tipe": "info", "read": True, "created_at": (now - timedelta(hours=3)).isoformat()},
    ]
    await db.notifications.insert_many(notifications)

    return True
