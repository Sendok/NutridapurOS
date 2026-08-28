# NutriDapur OS — Development Plan (FastAPI + React + MongoDB)

## 1) Objectives
- Prove **core workflow** works: **AI Menu Generator via OpenRouter** (minimax/minimax-m3:free) returns **structured JSON** reliably with **8s timeout** and **graceful local fallback**.
- Build production-ready MVP web app in Bahasa Indonesia with modules A–J, mobile-responsive UI (green `#16a34a` + amber accents), real JWT auth + RBAC, seeded demo accounts + 5-day realistic ops data.
- Ensure end-to-end flows don’t break when AI fails, when data is missing, or when user switches roles.

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation): OpenRouter JSON + Timeout + Fallback
**User stories**
1. As an operator, I want to generate 3 menu options from an AI model so I can plan MBG menus fast.
2. As an operator, I want the system to **never fail** when AI is slow/down by switching to local templates.
3. As a nutrition auditor, I want AI output in **strict JSON** so it can be audited and displayed consistently.
4. As an operator, I want menu costs and nutrients included so I can hit Rp 15.000/porsi.
5. As a developer, I want a single script that validates integration quickly before building the full app.

**Steps**
1. Websearch: confirm OpenRouter chat completions request/headers best-practices + JSON schema prompting patterns.
2. Create `poc_openrouter_menu.py`:
   - Reads `OPENROUTER_API_KEY` from env.
   - Calls `https://openrouter.ai/api/v1/chat/completions` with model `minimax/minimax-m3:free`.
   - Enforces **8-second timeout**.
   - Prompts for **strict JSON** with a defined schema (3 menus: Ekonomis/Seimbang/High-Protein).
3. Validate:
   - Success path: JSON parses, contains required keys, totals make sense.
   - Failure path: simulate timeout / bad key → **falls back** to local dataset JSON and exits 0.
4. Iterate until stable; lock prompt/schema.

**Deliverable**: POC script + local dataset JSON + printed validation summary.

---

### Phase 2 — V1 App Development (MVP end-to-end, core proven)
> Build app around the proven AI+fallback core; keep modules complete but MVP-level.

**User stories**
1. As a new visitor, I want a landing page explaining NutriDapur OS vs SIPGN so I understand the value fast.
2. As a demo user, I want 1-click login by role so I can explore without setup.
3. As an admin, I want a dashboard with budget/compliance charts so I can monitor operations daily.
4. As a user, I want AI menu generation that gracefully falls back so the UI never breaks.
5. As an admin, I want procurement PO text auto-formatted and opened in WhatsApp so I can order instantly.
6. As a QC officer/auditor, I want to upload photos + mark approved so distribution can proceed.
7. As a school, I want delivery status tracking so I can confirm receipt and issues.
8. As a parent, I want a QR-based portal to see today’s menu, QC photo, nutrition, and submit feedback.

**Backend (FastAPI)**
1. Project skeleton + config:
   - `.env`: `MONGO_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`.
   - CORS, structured logging, pydantic settings.
2. Mongo models/collections (MVP): users, menus, procurements, qc_logs, deliveries, feedback, notifications, financials, ops_days.
3. Auth:
   - JWT login/register, bcrypt hashing.
   - RBAC middleware/dependencies for 4 roles.
   - Seed demo accounts (admin/gizi/sekolah) + seed 5-day ops data.
4. Core endpoints (minimum):
   - `POST /api/ai/menus/generate` (OpenRouter with 8s timeout + local fallback + toast-friendly response flags)
   - `POST /api/menus/{id}/lock`, `GET /api/menus/current`
   - `POST /api/procurements/from-locked-menu`, `GET /api/procurements`
   - `POST /api/qc/upload` (base64 + tags), `POST /api/qc/{id}/approve`
   - `GET/POST /api/deliveries` status updates
   - `GET /api/parent-portal?token=...` (public read)
   - `POST /api/feedback` (public submit)
   - `GET /api/dashboard/summary` + chart series
   - `GET /api/reports/sipgn-export` (file download simulation)
5. Local fallback datasets:
   - JSON menus by age group (SD/SMP/SMA) with prices + nutrients + allergens.

**Frontend (React)**
1. App shell:
   - Responsive layout, header bell notifications, global toast system.
   - Routing: landing, login, dashboard, modules, `/parent-portal` (public).
2. Login:
   - Quick demo buttons mapping to seeded accounts.
3. Dashboard:
   - Stat cards + charts (7 days budget vs actual; nutrition breakdown).
4. AI Menu Generator:
   - Form inputs + ingredient checklist.
   - Results view with 3 menu cards, nutrient/cost breakdown, allergen badges.
   - UI handles `fallback_used=true` with toast “Mode Cepat”.
5. Procurement:
   - Shopping list + vendor WA form + `wa.me` link generation.
6. QC:
   - Dropzone base64 upload + checklist + approval status.
7. Distribution + Label printing:
   - Delivery tracker table.
   - Sticker modal with printable layout + dynamic QR to parent portal.
8. Parent Portal (NutriTransparan):
   - Verification badge, QC photo banner, AKG meters, expiration countdown, ingredients/allergens, feedback submission.
9. Tutorial/Onboarding:
   - Floating “Panduan Penggunaan” modal with 5-step tour.

**End Phase 2 Testing (1 round)**
- Run seeded demo flows end-to-end per role + public portal, including forced AI failure (disable key) to confirm fallback UX.

---

### Phase 3 — Stabilization, RBAC hardening, Reports & QA polish
**User stories**
1. As an admin, I want notifications to reflect real incomplete tasks so nothing is missed.
2. As an auditor, I want QC approvals to gate distribution status so compliance is enforced.
3. As a parent, I want feedback to instantly affect dashboard rating stats so it feels responsive.
4. As an admin, I want financial P\&L to be consistent with procurement + ops costs.
5. As a school, I want delivery status transitions to be consistent and auditable.

**Steps**
1. RBAC audit: ensure each endpoint/UI route is role-protected correctly.
2. Data integrity passes:
   - Link: locked menu → procurement → QC → delivery → parent portal.
3. Notification engine:
   - Generate notifications based on real state (PO not sent, QC pending, report ready).
4. SIPGN export polishing:
   - Standardized JSON/CSV/PDF-like output (simulated) with correct locale formatting.
5. Performance + error handling:
   - Tighten OpenRouter retries (0–1), timeout enforcement, response validation.

**End Phase 3 Testing (1 round)**
- Full regression: all modules A–J + mobile checks + offline/failure states.

---

### Phase 4 — Production readiness upgrades (post-MVP)
**User stories**
1. As an operator, I want audit logs so I can trace who approved QC and when.
2. As an admin, I want environment-based config so staging/prod are safe.
3. As a team, we want CI checks so regressions are caught early.
4. As an admin, I want better export formats (PDF layout) for sharing.
5. As a vendor, I want multi-dapur support (optional) as we scale.

**Steps**
- Add audit log collection, rate limiting, request IDs.
- Add CI lint/test, build scripts, containerization notes.
- Refactor modules into cleaner service layers where needed.

## 3) Next Actions
1. Implement Phase 1 POC script + local fallback JSON; run until stable.
2. Freeze JSON schema and prompt; document expected response contract.
3. Scaffold FastAPI + React + MongoDB projects; implement `/api/ai/menus/generate` first (using proven POC code).
4. Seed demo users + 5-day ops dataset; add demo login buttons.
5. Build landing + dashboard + AI menu module end-to-end; then expand to procurement/QC/distribution/parent portal.

## 4) Success Criteria
- POC: OpenRouter call returns valid JSON within 8s; on failure, fallback returns valid local menu JSON with `fallback_used=true` and no unhandled exceptions.
- App: All roles can complete their primary flows; demo logins work; parent portal works without auth.
- UX: No blank states without guidance; toasts + notifications appear for key actions; mobile layout usable.
- Data: Locked menu drives procurement/QC/distribution; parent feedback updates dashboard rating.
- Export: SIPGN/BGN report download works (simulated) and uses Rupiah formatting.

---
## STATUS UPDATE (Phase 1 & 2 COMPLETE)
- Phase 1 POC: PASSED first run. OpenRouter (minimax/minimax-m3:free) returns live JSON menus <8s; bad-key/timeout gracefully falls back to local dataset. Script: /app/backend/poc_openrouter_menu.py
- Phase 2 App: COMPLETE. All modules A-J built and tested (testing agent iteration_1: backend 96.6%, frontend 100%, overall 98.3%, zero critical bugs).
- Demo accounts seeded: admin@nutridapur.id, gizi@nutridapur.id, sekolah@nutridapur.id (password: demo123).
- Next (Phase 3, if requested): notification engine refinements, audit logs, PDF-layout export, multi-dapur support.
