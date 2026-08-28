"""Local fallback menu datasets untuk NutriDapur OS.
Digunakan ketika OpenRouter API gagal/timeout (>8 detik).
Semua harga dalam Rupiah, gizi sesuai standar AKG BGN.
"""

FALLBACK_MENUS = {
    "SD": [
        {
            "tipe": "Ekonomis",
            "nama_menu": "Nasi Ayam Suwir Kuning Komplit",
            "deskripsi": "Menu hemat bergizi dengan protein ayam suwir dan sayur hijau segar.",
            "items": [
                {"nama": "Nasi Putih (150g)", "harga": 2500},
                {"nama": "Ayam Suwir Bumbu Kuning (60g)", "harga": 5500},
                {"nama": "Tempe Goreng (40g)", "harga": 1500},
                {"nama": "Cah Kangkung (60g)", "harga": 2000},
                {"nama": "Pisang Ambon (1 buah)", "harga": 1500},
                {"nama": "Air Mineral Gelas", "harga": 500}
            ],
            "total_biaya": 13500,
            "gizi": {"kalori": 515, "protein_g": 21, "karbohidrat_g": 72, "lemak_g": 12},
            "mikronutrien": ["Vitamin A", "Vitamin C", "Zat Besi", "Kalsium"],
            "alergen": ["Kedelai (Tempe)"],
            "bebas_alergen": ["Kacang Tanah", "Seafood", "Telur"],
            "bgn_compliant": True
        },
        {
            "tipe": "Seimbang",
            "nama_menu": "Nasi Ayam Goreng Lengkuas Set",
            "deskripsi": "Menu seimbang 4 Bintang: karbohidrat, protein hewani & nabati, sayur, dan buah.",
            "items": [
                {"nama": "Nasi Putih (150g)", "harga": 2500},
                {"nama": "Ayam Goreng Lengkuas (70g)", "harga": 6000},
                {"nama": "Tempe Bacem (40g)", "harga": 1500},
                {"nama": "Cah Bayam Wortel (70g)", "harga": 2500},
                {"nama": "Pisang Ambon (1 buah)", "harga": 1500},
                {"nama": "Air Mineral Gelas", "harga": 500}
            ],
            "total_biaya": 14500,
            "gizi": {"kalori": 520, "protein_g": 21, "karbohidrat_g": 68, "lemak_g": 14},
            "mikronutrien": ["Vitamin A", "Vitamin C", "Kalsium", "Zat Besi"],
            "alergen": ["Kedelai (Tempe)", "Ayam"],
            "bebas_alergen": ["Kacang Tanah", "Seafood"],
            "bgn_compliant": True
        },
        {
            "tipe": "High-Protein",
            "nama_menu": "Nasi Lele Goreng Telur Dadar",
            "deskripsi": "Menu tinggi protein dengan ikan lele lokal dan telur untuk tumbuh kembang optimal.",
            "items": [
                {"nama": "Nasi Putih (150g)", "harga": 2500},
                {"nama": "Ikan Lele Goreng (80g)", "harga": 6000},
                {"nama": "Telur Dadar Mini (30g)", "harga": 2000},
                {"nama": "Tumis Buncis Wortel (60g)", "harga": 2000},
                {"nama": "Semangka Potong", "harga": 1500},
                {"nama": "Air Mineral Gelas", "harga": 500}
            ],
            "total_biaya": 14500,
            "gizi": {"kalori": 545, "protein_g": 27, "karbohidrat_g": 65, "lemak_g": 16},
            "mikronutrien": ["Vitamin A", "Vitamin D", "Omega-3", "Zat Besi"],
            "alergen": ["Telur", "Ikan (Lele)"],
            "bebas_alergen": ["Kacang Tanah", "Kedelai"],
            "bgn_compliant": True
        }
    ],
    "SMP": [
        {
            "tipe": "Ekonomis",
            "nama_menu": "Nasi Tempe Orek Telur Balado",
            "deskripsi": "Menu hemat porsi remaja dengan protein ganda tempe dan telur.",
            "items": [
                {"nama": "Nasi Putih (200g)", "harga": 3000},
                {"nama": "Telur Balado (1 butir)", "harga": 3000},
                {"nama": "Tempe Orek Kering (50g)", "harga": 2000},
                {"nama": "Cah Kangkung Tauge (70g)", "harga": 2500},
                {"nama": "Pisang Kepok Rebus", "harga": 1500},
                {"nama": "Air Mineral Gelas", "harga": 500}
            ],
            "total_biaya": 12500,
            "gizi": {"kalori": 610, "protein_g": 23, "karbohidrat_g": 88, "lemak_g": 15},
            "mikronutrien": ["Vitamin C", "Zat Besi", "Folat", "Kalsium"],
            "alergen": ["Telur", "Kedelai (Tempe)"],
            "bebas_alergen": ["Kacang Tanah", "Seafood"],
            "bgn_compliant": True
        },
        {
            "tipe": "Seimbang",
            "nama_menu": "Nasi Ayam Kecap Tahu Isi Sayur",
            "deskripsi": "Kombinasi seimbang protein hewani-nabati dengan sayuran musiman.",
            "items": [
                {"nama": "Nasi Putih (200g)", "harga": 3000},
                {"nama": "Ayam Kecap Potong (75g)", "harga": 6500},
                {"nama": "Tahu Isi Sayur (1 buah)", "harga": 1500},
                {"nama": "Sup Sayur Bening (80g)", "harga": 2000},
                {"nama": "Jeruk Manis (1 buah)", "harga": 1500},
                {"nama": "Air Mineral Gelas", "harga": 500}
            ],
            "total_biaya": 15000,
            "gizi": {"kalori": 650, "protein_g": 26, "karbohidrat_g": 90, "lemak_g": 16},
            "mikronutrien": ["Vitamin A", "Vitamin C", "Kalsium", "Zat Besi"],
            "alergen": ["Kedelai (Tahu)", "Ayam"],
            "bebas_alergen": ["Kacang Tanah", "Telur", "Seafood"],
            "bgn_compliant": True
        },
        {
            "tipe": "High-Protein",
            "nama_menu": "Nasi Ikan Lele Sambal Tahu Goreng",
            "deskripsi": "Protein tinggi dari ikan lele segar pasar lokal, mendukung pertumbuhan remaja.",
            "items": [
                {"nama": "Nasi Putih (200g)", "harga": 3000},
                {"nama": "Ikan Lele Goreng (100g)", "harga": 7000},
                {"nama": "Tahu Goreng (2 potong)", "harga": 1500},
                {"nama": "Lalapan + Sambal", "harga": 1500},
                {"nama": "Pepaya Potong", "harga": 1500},
                {"nama": "Air Mineral Gelas", "harga": 500}
            ],
            "total_biaya": 15000,
            "gizi": {"kalori": 675, "protein_g": 32, "karbohidrat_g": 85, "lemak_g": 18},
            "mikronutrien": ["Omega-3", "Vitamin D", "Zat Besi", "Fosfor"],
            "alergen": ["Ikan (Lele)", "Kedelai (Tahu)"],
            "bebas_alergen": ["Kacang Tanah", "Telur"],
            "bgn_compliant": True
        }
    ],
    "SMA": [
        {
            "tipe": "Ekonomis",
            "nama_menu": "Nasi Telur Dadar Tempe Goreng Komplit",
            "deskripsi": "Menu hemat porsi besar untuk siswa SMA dengan energi cukup hingga sore.",
            "items": [
                {"nama": "Nasi Putih (250g)", "harga": 3500},
                {"nama": "Telur Dadar (1 butir)", "harga": 3000},
                {"nama": "Tempe Goreng (2 potong)", "harga": 2000},
                {"nama": "Tumis Kangkung (80g)", "harga": 2500},
                {"nama": "Pisang Ambon (1 buah)", "harga": 1500},
                {"nama": "Air Mineral Gelas", "harga": 500}
            ],
            "total_biaya": 13000,
            "gizi": {"kalori": 720, "protein_g": 25, "karbohidrat_g": 105, "lemak_g": 18},
            "mikronutrien": ["Vitamin C", "Zat Besi", "Folat", "Magnesium"],
            "alergen": ["Telur", "Kedelai (Tempe)"],
            "bebas_alergen": ["Kacang Tanah", "Seafood"],
            "bgn_compliant": True
        },
        {
            "tipe": "Seimbang",
            "nama_menu": "Nasi Ayam Bakar Bumbu Rujak Set",
            "deskripsi": "Menu 4 Bintang lengkap dengan ayam bakar, sayur, dan buah segar.",
            "items": [
                {"nama": "Nasi Putih (250g)", "harga": 3500},
                {"nama": "Ayam Bakar Bumbu Rujak (80g)", "harga": 7000},
                {"nama": "Tahu Bacem (1 potong)", "harga": 1500},
                {"nama": "Urap Sayur (70g)", "harga": 2000},
                {"nama": "Semangka Potong", "harga": 1500},
                {"nama": "Air Mineral Gelas", "harga": 500}
            ],
            "total_biaya": 15000,
            "gizi": {"kalori": 760, "protein_g": 30, "karbohidrat_g": 108, "lemak_g": 19},
            "mikronutrien": ["Vitamin A", "Vitamin C", "Kalsium", "Zat Besi"],
            "alergen": ["Kedelai (Tahu)", "Ayam", "Kelapa (Urap)"],
            "bebas_alergen": ["Kacang Tanah", "Telur", "Seafood"],
            "bgn_compliant": True
        },
        {
            "tipe": "High-Protein",
            "nama_menu": "Nasi Ikan Lele Telur Rebus Power Set",
            "deskripsi": "Protein maksimal untuk siswa aktif: lele, telur, dan tempe dalam satu porsi.",
            "items": [
                {"nama": "Nasi Putih (250g)", "harga": 3500},
                {"nama": "Ikan Lele Goreng (100g)", "harga": 7000},
                {"nama": "Telur Rebus (1 butir)", "harga": 2500},
                {"nama": "Cah Bayam (70g)", "harga": 2000},
                {"nama": "Pisang Ambon (1 buah)", "harga": 1500},
                {"nama": "Air Mineral Gelas", "harga": 500}
            ],
            "total_biaya": 15000,
            "gizi": {"kalori": 780, "protein_g": 38, "karbohidrat_g": 100, "lemak_g": 21},
            "mikronutrien": ["Omega-3", "Vitamin D", "Vitamin B12", "Zat Besi"],
            "alergen": ["Ikan (Lele)", "Telur"],
            "bebas_alergen": ["Kacang Tanah", "Kedelai"],
            "bgn_compliant": True
        }
    ]
}
