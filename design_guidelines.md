{
  "product": {
    "name": "NutriDapur OS",
    "tagline": "AI Operational OS untuk Dapur MBG — patuh BGN & SIPGN, tanpa ribet.",
    "brand_attributes": [
      "tepercaya (government-adjacent)",
      "jelas & mudah dipahami (mixed tech literacy)",
      "operasional (data-dense tapi rapi)",
      "hangat & manusiawi (untuk orang tua)"
    ],
    "design_personality": {
      "style_fusion": [
        "Swiss-style clarity (grid ketat, tipografi rapi)",
        "Bento dashboard (kartu modular)",
        "Soft glass accents (hanya untuk highlight/hero, bukan area baca)",
        "Government-adjacent restraint (minim dekorasi, fokus status & bukti)"
      ],
      "avoid": [
        "layout serba center",
        "gradien gelap/saturated",
        "visual terlalu playful",
        "ikon emoji"
      ]
    }
  },
  "inspiration_refs": {
    "notes": "Ambil pola interaktif (tab switcher, data cards, comparison table) dari landing foodtech; ambil prinsip '30-second gate check' untuk parent portal.",
    "sources": [
      {
        "url": "https://www.rocket.new/templates/kitcheniq-predictive-foodtech-landing-page-template",
        "what_to_borrow": [
          "Hero dengan tab switcher (3 mode) untuk demo fitur",
          "Comparison table yang tegas (SIPGN vs NutriDapur OS)",
          "Sticky CTA bar setelah user berinteraksi",
          "Timeline/commit-log untuk milestone kepatuhan"
        ]
      },
      {
        "url": "https://codttech.com/portfolio/happybee",
        "what_to_borrow": [
          "Prinsip 'thirty-second school-gate check' (glanceable)",
          "Allergen flags harus akurat & jelas",
          "Notifikasi yang relevan saja",
          "Multi-surface: per-anak/per-hari ringkas"
        ]
      }
    ]
  },
  "typography": {
    "font_pairing": {
      "display": {
        "family": "Space Grotesk",
        "fallback": "ui-sans-serif, system-ui",
        "usage": "H1/H2, angka KPI, judul kartu"
      },
      "body": {
        "family": "Figtree",
        "fallback": "ui-sans-serif, system-ui",
        "usage": "body, label form, tabel, portal orang tua"
      }
    },
    "tailwind_setup_notes": [
      "Import via Google Fonts in index.html (atau CSS @import) untuk Space Grotesk + Figtree.",
      "Set body font ke Figtree; headings/kpi gunakan class font-display (Space Grotesk)."
    ],
    "type_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-display tracking-tight",
      "h2": "text-base md:text-lg text-muted-foreground",
      "section_title": "text-xl sm:text-2xl font-display",
      "card_title": "text-sm font-medium",
      "kpi": "text-2xl sm:text-3xl font-display tabular-nums",
      "body": "text-sm sm:text-base",
      "caption": "text-xs text-muted-foreground"
    }
  },
  "color_system": {
    "notes": "Primary wajib #16a34a. Aksen hangat amber/orange untuk status/CTA sekunder. Base netral terang untuk rasa resmi & mudah dibaca.",
    "tokens_hsl_for_shadcn": {
      "background": "0 0% 99%",
      "foreground": "222 47% 11%",
      "card": "0 0% 100%",
      "card-foreground": "222 47% 11%",
      "popover": "0 0% 100%",
      "popover-foreground": "222 47% 11%",
      "primary": "142 71% 36%",
      "primary-foreground": "0 0% 100%",
      "secondary": "210 40% 96%",
      "secondary-foreground": "222 47% 11%",
      "muted": "210 40% 96%",
      "muted-foreground": "215 16% 47%",
      "accent": "36 100% 94%",
      "accent-foreground": "24 95% 20%",
      "destructive": "0 84% 60%",
      "destructive-foreground": "0 0% 100%",
      "border": "214 32% 91%",
      "input": "214 32% 91%",
      "ring": "142 71% 36%",
      "radius": "0.75rem",
      "chart-1": "142 71% 36%",
      "chart-2": "36 92% 50%",
      "chart-3": "199 89% 48%",
      "chart-4": "262 83% 58%",
      "chart-5": "0 84% 60%"
    },
    "semantic_colors": {
      "success": "#16a34a",
      "warning": "#f59e0b",
      "info": "#0ea5e9",
      "danger": "#ef4444",
      "surface": "#ffffff",
      "surface_2": "#f8fafc",
      "ink": "#0f172a",
      "ink_muted": "#475569"
    },
    "allowed_gradients": {
      "rule": "Gunakan hanya sebagai background section dekoratif (<=20% viewport), tidak untuk area baca.",
      "hero_bg": "linear-gradient(135deg, rgba(22,163,74,0.10) 0%, rgba(245,158,11,0.10) 55%, rgba(14,165,233,0.06) 100%)",
      "accent_wash": "radial-gradient(60% 60% at 20% 10%, rgba(22,163,74,0.12) 0%, rgba(22,163,74,0) 60%), radial-gradient(50% 50% at 90% 20%, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0) 55%)"
    },
    "texture": {
      "noise_overlay_css": "background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.08%22/%3E%3C/svg%3E');",
      "usage": "Tambahkan sebagai overlay tipis pada hero/landing background saja (opacity rendah)."
    }
  },
  "layout_grid": {
    "app_shell": {
      "desktop": "Sidebar kiri (collapsible) + topbar (notification bell + profile) + content container max-w-[1200px]",
      "mobile": "Topbar sticky + bottom nav opsional (atau sidebar via Sheet)."
    },
    "containers": {
      "landing": "max-w-6xl mx-auto px-4 sm:px-6",
      "dashboard": "max-w-[1200px] mx-auto px-4 sm:px-6",
      "parent_portal": "max-w-md mx-auto px-4"
    },
    "spacing_system": {
      "section_y": "py-10 sm:py-14",
      "card_gap": "gap-3 sm:gap-4",
      "form_gap": "gap-3"
    }
  },
  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "use_these": [
        "button.jsx",
        "card.jsx",
        "badge.jsx",
        "tabs.jsx",
        "table.jsx",
        "dialog.jsx",
        "drawer.jsx",
        "sheet.jsx",
        "dropdown-menu.jsx",
        "select.jsx",
        "progress.jsx",
        "tooltip.jsx",
        "sonner.jsx",
        "calendar.jsx",
        "carousel.jsx",
        "separator.jsx",
        "accordion.jsx",
        "checkbox.jsx",
        "textarea.jsx",
        "input.jsx"
      ]
    },
    "page_blueprints": {
      "landing_/": {
        "sections": [
          {
            "name": "Header",
            "layout": "Left logo + nav links (Fitur, Kepatuhan, Portal Orang Tua, Harga) + CTA Masuk",
            "components": ["navigation-menu", "button", "badge"],
            "microcopy": "Badge kecil: 'Ekosistem Pelengkap SIPGN'"
          },
          {
            "name": "Hero",
            "layout": "Split: kiri copy + CTA, kanan mock dashboard card stack (bento) + tab switcher 3 fitur",
            "components": ["tabs", "card", "button", "badge"],
            "interaction": "Tabs mengganti preview (Menu AI / QC Foto / Ekspor SIPGN). Setelah klik tab pertama, munculkan sticky CTA bar."
          },
          {
            "name": "SIPGN Comparison",
            "layout": "Table perbandingan: SIPGN (wajib) vs NutriDapur OS (melengkapi) dengan checkmarks",
            "components": ["table", "badge"],
            "note": "Gunakan bahasa yang aman: 'melengkapi', bukan 'menggantikan'."
          },
          {
            "name": "Feature Bento",
            "layout": "Bento grid 2x3: Menu AI, Procurement WA, QC Audit, Distribusi+QR, Finance P&L, Parent Portal",
            "components": ["card", "badge"],
            "interaction": "Hover: border ring hijau + shadow naik tipis."
          },
          {
            "name": "Impact Counters",
            "layout": "3-4 counters (hemat waktu, kepatuhan, transparansi) dengan animasi count-up",
            "components": ["card"],
            "library": "framer-motion + count-up kecil (custom)"
          },
          {
            "name": "CTA",
            "layout": "Card besar solid (tanpa gradien gelap) dengan 2 tombol: 'Coba Demo' + 'Hubungi Kami'",
            "components": ["card", "button"]
          }
        ]
      },
      "login_/login": {
        "layout": "Card centered-left (bukan center text), ilustrasi/visual di kanan (desktop)",
        "components": ["card", "input", "button", "separator"],
        "special": "3 tombol Quick Demo Login (Admin Dapur, Ahli Gizi, Guru) + 1 untuk Orang Tua (langsung ke /parent-portal). Semua pakai data-testid."
      },
      "dashboard_/dashboard": {
        "topbar": "Notification bell center (dropdown list) + tombol 'Panduan Penggunaan'",
        "main": [
          "Stat cards 4-up (mobile 2x2) dengan icon lucide",
          "Chart 1: Budget vs Actual 7 hari (Recharts line/area)",
          "Chart 2: Distribusi gizi (stacked bar / donut)"
        ],
        "components": ["card", "dropdown-menu", "tabs", "tooltip", "sonner"],
        "data_density": "Gunakan tabular-nums untuk angka; label ringkas; tooltip untuk definisi metrik."
      },
      "menu-generator_/menu-generator": {
        "layout": "Form kiri (atau atas di mobile) + hasil 3 kartu menu (Ekonomis/Seimbang/High-Protein)",
        "components": ["form", "select", "textarea", "button", "card", "badge", "progress"],
        "details": "Setiap kartu: nama menu, nutrisi (kalori/protein/serat), breakdown biaya Rp, badge alergen, indikator kepatuhan BGN (badge hijau/amber). Tombol 'Kunci Menu' per kartu."
      },
      "procurement_/procurement": {
        "layout": "Shopping list (table) + panel kanan 'Buat PO WhatsApp'",
        "components": ["table", "input", "textarea", "button", "card"],
        "interaction": "Generate wa.me link; tombol 'Salin Pesan' + toast sukses."
      },
      "qc_/qc": {
        "layout": "Dropzone besar + checklist + log audit",
        "components": ["card", "checkbox", "badge", "dialog"],
        "interaction": "Dropzone state: idle/dragover/uploading/done. Checklist completion animates progress bar."
      },
      "distribution_/distribution": {
        "layout": "Table tracker + modal 'Cetak Label Box'",
        "components": ["table", "dialog", "button", "badge"],
        "print": "Modal berisi preview sticker (A6/label) + QR code + info sekolah/tanggal/menu. Tambahkan print CSS."
      },
      "finance_/finance": {
        "layout": "P&L table + KPI margin + tombol export SIPGN",
        "components": ["table", "card", "button", "tabs"],
        "interaction": "Export button punya loading state + toast."
      },
      "parent-portal_/parent-portal": {
        "principle": "Mobile-first, glanceable, trust-first.",
        "layout": [
          "Header kecil: verifikasi QR + nama sekolah + tanggal",
          "QC photo banner (aspect ratio 16:9) + badge status",
          "AKG meters: 3-5 progress bars (Energi, Protein, Serat, Gula, Natrium)",
          "Food safety countdown (timestamp) dengan warna status",
          "Ingredients + allergen chips",
          "Form rating bintang + komentar (simple)"
        ],
        "components": ["card", "badge", "progress", "textarea", "button"],
        "interaction": "Countdown tick tiap 1 menit; rating bintang hover/tap; submit -> toast."
      }
    },
    "component_states": {
      "buttons": {
        "primary": "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring",
        "secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        "amber": "bg-amber-500 text-white hover:bg-amber-500/90",
        "ghost": "hover:bg-muted"
      },
      "badges": {
        "compliance_ok": "bg-emerald-50 text-emerald-700 border border-emerald-200",
        "compliance_warn": "bg-amber-50 text-amber-800 border border-amber-200",
        "status_info": "bg-sky-50 text-sky-700 border border-sky-200",
        "status_danger": "bg-rose-50 text-rose-700 border border-rose-200"
      },
      "cards": {
        "base": "rounded-xl border bg-card shadow-sm",
        "hover": "hover:shadow-md hover:border-foreground/10",
        "kpi": "p-4 sm:p-5"
      },
      "inputs": {
        "base": "focus-visible:ring-2 focus-visible:ring-ring",
        "error": "border-rose-300 focus-visible:ring-rose-400"
      }
    }
  },
  "motion_microinteractions": {
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "usage_notes": [
        "Gunakan untuk: entrance (fade+slide 8px), hover lift kartu, sticky CTA reveal, onboarding tour modal transitions.",
        "Hormati prefers-reduced-motion."
      ]
    },
    "principles": [
      "Durasi 160–220ms untuk hover; 240–320ms untuk modal/route section entrance",
      "Easing: cubic-bezier(0.2, 0.8, 0.2, 1)",
      "Jangan pakai transition: all"
    ],
    "patterns": {
      "card_hover": "transform-gpu hover:-translate-y-0.5 transition-[box-shadow,border-color] duration-200",
      "button_press": "active:scale-[0.98] transition-[background-color,box-shadow]",
      "notification_pulse": "Gunakan ping halus pada dot unread (animate-pulse)"
    }
  },
  "charts": {
    "library": "recharts",
    "styling": {
      "grid": "stroke: hsl(var(--border))",
      "axis": "tick fill: hsl(var(--muted-foreground))",
      "series": {
        "budget": "stroke: #0ea5e9",
        "actual": "stroke: #16a34a",
        "nutrition": "use chart-1..chart-5 tokens"
      }
    },
    "empty_states": {
      "pattern": "Card dengan Skeleton + copy: 'Belum ada data 7 hari terakhir.' + CTA kecil 'Tambah transaksi'"
    }
  },
  "print_and_qr": {
    "sticker_spec": {
      "size": "A6 / 105mm x 148mm (default) + opsi 100x150mm",
      "layout": [
        "Header: 'MBG — Label Box' + badge kepatuhan",
        "QR besar kanan",
        "Kiri: Sekolah, Tanggal, Shift, Menu, Alergen, Batch ID",
        "Footer: 'Diproduksi oleh Dapur: {nama}'"
      ],
      "print_css_notes": [
        "Gunakan @media print untuk menyembunyikan chrome UI.",
        "Set body background putih, hilangkan shadow.",
        "Pastikan QR tetap tajam (SVG/canvas)."
      ]
    }
  },
  "accessibility": {
    "requirements": [
      "Kontras teks minimal WCAG AA",
      "Focus ring terlihat (ring hijau)",
      "Target sentuh min 44px untuk portal orang tua",
      "Gunakan aria-label untuk ikon (bell, print, whatsapp)",
      "Prefer-reduced-motion support"
    ]
  },
  "testing_attributes": {
    "rule": "Semua elemen interaktif & info penting wajib data-testid (kebab-case).",
    "examples": [
      "data-testid=\"landing-hero-primary-cta\"",
      "data-testid=\"login-demo-admin-button\"",
      "data-testid=\"dashboard-budget-actual-chart\"",
      "data-testid=\"menu-generator-submit-button\"",
      "data-testid=\"procurement-whatsapp-send-button\"",
      "data-testid=\"qc-dropzone\"",
      "data-testid=\"distribution-print-label-button\"",
      "data-testid=\"parent-portal-rating-submit\""
    ]
  },
  "image_urls": {
    "hero_landing": [
      {
        "url": "https://images.unsplash.com/photo-1562514155-444b9a967dfa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwc3RhZmYlMjBwcmVwYXJpbmclMjBmb29kfGVufDB8fHxncmVlbnwxNzg3OTE5NTIyfDA&ixlib=rb-4.1.0&q=85",
        "description": "Dapur profesional (trust/operasional) untuk hero/landing side visual.",
        "category": "landing-hero"
      }
    ],
    "parent_portal_banner": [
      {
        "url": "https://images.unsplash.com/photo-1609710219624-201223bd6b1e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNDR8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbWVhbCUyMHByZXAlMjBraXRjaGVufGVufDB8fHxncmVlbnwxNzg3OTE5NTA0fDA&ixlib=rb-4.1.0&q=85",
        "description": "Foto makanan/box (placeholder) untuk banner QC di parent portal.",
        "category": "parent-portal-qc-banner"
      }
    ]
  },
  "instructions_to_main_agent": {
    "global_css_changes": [
      "Hapus/abaikan App.css default CRA (App-header center). Jangan gunakan .App { text-align:center }.",
      "Update /frontend/src/index.css tokens :root sesuai tokens_hsl_for_shadcn (primary hijau, accent amber).",
      "Tambahkan font imports + utility class .font-display (Space Grotesk).",
      "Tambahkan noise overlay class untuk hero saja (opacity rendah)."
    ],
    "routing_and_shell": [
      "Buat AppShell: Sidebar (desktop) + Sheet (mobile) + Topbar sticky.",
      "Notification bell center di topbar: DropdownMenu dengan list notifikasi + unread dot.",
      "Global toast: gunakan Sonner (/components/ui/sonner.jsx)."
    ],
    "page_specific": [
      "Landing: gunakan Tabs untuk 3 preview fitur; comparison table SIPGN vs NutriDapur OS.",
      "Login: sediakan quick demo login buttons (role-based) + data-testid.",
      "Dashboard: stat cards + Recharts 2 chart; gunakan tabular-nums.",
      "Menu Generator: 3 result cards (Ekonomis/Seimbang/High-Protein) dengan badge alergen + indikator kepatuhan.",
      "Procurement: generate wa.me link + tombol salin.",
      "QC: dropzone + checklist + status badges.",
      "Distribution: table + modal print label + QR.",
      "Parent Portal: max-w-md, glanceable, progress meters + countdown + rating form."
    ],
    "libraries": [
      {
        "name": "framer-motion",
        "why": "micro-interactions & entrance animations",
        "install": "npm i framer-motion"
      },
      {
        "name": "qrcode.react",
        "why": "QR code untuk label sticker",
        "install": "npm i qrcode.react"
      }
    ],
    "data_testid_policy": "Pastikan setiap Button/Input/Link/Tab trigger/Chart container/Table row action punya data-testid kebab-case."
  }
}

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
