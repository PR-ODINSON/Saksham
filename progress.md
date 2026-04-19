# Saksham / Tarkshaastra — Project Progress Report

> **Platform:** Saksham (सक्षम — "capable / empowered")
> **Repo:** Tarkshaastra
> **Problem Statement:** TS-03 — Predictive Maintenance Engine for School Infrastructure
> **Stack:** React 18 + Vite + Tailwind · Express 4 + Mongoose 7 · MongoDB Atlas · Socket.IO · Cloudinary · PDFKit
> **Last Updated:** April 19, 2026

---

## Table of Contents

1. [Problem Statement (TS-03) Summary](#1-problem-statement-ts-03-summary)
2. [PS-03 Requirements vs Implementation](#2-ps-03-requirements-vs-implementation)
3. [Repository Structure](#3-repository-structure)
4. [Technology Stack](#4-technology-stack)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Models & Schemas](#6-database-models--schemas)
7. [Prediction Stack (Heuristic + Linear Regression)](#7-prediction-stack-heuristic--linear-regression)
8. [Real-time Layer (Socket.IO)](#8-real-time-layer-socketio)
9. [Audit Logging & PDF Reports](#9-audit-logging--pdf-reports)
10. [Cloudinary Image Pipeline](#10-cloudinary-image-pipeline)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Internationalisation (EN / HI / GU)](#12-internationalisation-en--hi--gu)
13. [API Endpoints Reference](#13-api-endpoints-reference)
14. [CSV Pipeline & Scripts](#14-csv-pipeline--scripts)
15. [Environment & Deployment](#15-environment--deployment)
16. [Demo Accounts](#16-demo-accounts)

---

## 1. Problem Statement (TS-03) Summary

**Domain:** Public Institution · AI / ML
**Geography:** Gujarat (30,000+ government school buildings)

**Core problem.** School repairs happen **reactively** — after visible failure. PS-03 demands a **predictive** maintenance system that:

1. Lets peons / watchmen submit a weekly structured dropdown form (≤ 2 min) with mandatory photos.
2. Aggregates inputs and learns deterioration patterns by building age, material, and weather zone.
3. Flags schools **30 / 60 days from critical failure** across plumbing, electrical, and structural categories.
4. Routes a principal-reviewed bundle into a DEO district-level prioritised maintenance queue.
5. Lets the DEO assign work orders to contractors with deadlines and SLA tracking.
6. Captures completion via GPS + photo proof and feeds the result back into the model (learning loop).

**Roles:** `peon` · `principal` · `deo` · `contractor` · `admin`

---

## 2. PS-03 Requirements vs Implementation

### Fully Implemented

| # | PS-03 Requirement | Status | Where |
|---|---|---|---|
| 1 | Weekly dropdown form (no free text, ≤ 2 min) | Done | `WeeklyInputForm.jsx` |
| 2 | Mandatory on-site photo for peon submissions | Done | `report.controller.js` enforces server-side |
| 3 | Bundled weekly submission (3 categories + 3 photos in 1 call) | Done | `POST /api/reports/weekly` |
| 4 | Category-specific prediction (plumbing / electrical / structural) | Done | `predictRiskForCategory()` |
| 5 | Cited evidence on every prediction | Done | `evidence[]` array |
| 6 | Trained ML model (linear regression on TS-PS3.csv) | Done | `services/lrModel.js` + `scripts/trainLR.js` |
| 7 | Student-impact prioritisation (girls' toilet > storage wall) | Done | `girlsSchool ×1.5` + student multiplier |
| 8 | 30 / 60-day failure horizon per category | Done | `within_30_days`, `within_60_days`, LR `fail30Probability` |
| 9 | Principal review + forward to DEO workflow | Done | `PATCH /:id/review`, `POST /weekly/:school/:week/forward` |
| 10 | District-level maintenance queue (not alert flood) | Done | `GET /api/risk/queue` aggregated by school |
| 11 | Contractor accept / reject task flow | Done | `PATCH /api/tasks/:id/respond` (school + district scope) |
| 12 | Contractor work-order + photo + GPS completion | Done | `/api/tasks/assign` + `/api/tasks/complete` |
| 13 | GPS validation via Haversine (5 km threshold) | Done | `getDistanceKM()` in `workorder.controller.js` |
| 14 | Auto `GPS_MISMATCH` alert when location off | Done | `Alert.create({ type: 'GPS_MISMATCH' })` |
| 15 | SLA breach detection (deadline vs completion) | Done | `slaBreached` flag on `RepairLog` + `WorkOrder` |
| 16 | Model learns from completed repairs | Done | `RepairLog.predictionSnapshot` + `predictionError` |
| 17 | Model accuracy analytics endpoint | Done | `GET /api/analytics/model-accuracy` |
| 18 | Real-time Socket.IO push (DEO room, contractor room, school room, admin room) | Done | `socket/index.js` + emits in every controller |
| 19 | Immutable audit log (90-day TTL) | Done | `AuditLog` model + `writeAuditLog()` helper |
| 20 | Bundled PDF report download (per school + week) | Done | `reportGenerator.js` + `GET /api/reports/:id/pdf` |
| 21 | Cloudinary cloud storage for photos + PDFs | Done | `config/cloudinary.js` |
| 22 | Geospatial map for DEO / admin (clustered markers + heatmap-ready) | Done | `GeospatialMap.jsx` + `GET /api/risk/heatmap` |
| 23 | Dynamic `PriorityConfig` — admin retunes scoring weights without deploy | Done | `PUT /api/admin/priority-config` + cache invalidation |
| 24 | Trilingual UI (English · हिन्दी · ગુજરાતી) | Done | `LanguageContext` + `translations` dictionary |
| 25 | Rate limiting (200 req / 15 min per IP) | Done | `middleware/rateLimiter.js` |
| 26 | CSV bulk pipeline for 50,000-row historical dataset | Done | `scripts/loadCSV.js` + `scripts/trainLR.js` |

### Roadmap / Future

- Auto-retune `PriorityConfig` weights from `predictionError` aggregates (currently logged, not auto-applied).
- WebSocket-based push notifications surfaced in a global toast component.
- Pagination on `/api/risk/queue` and `/api/risk/all` for very large districts.

---

## 3. Repository Structure

```
D:\Tarkshaastra\
├── README.md
├── progress.md                          ← this file
├── remaining.md                         ← backlog tracker
├── TS-PS3.csv                           ← 50 000-row historical dataset
├── .gitignore
│
├── frontend/                            ← React 18 + Vite SPA
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vercel.json                      ← SPA rewrite rules
│   ├── package.json
│   └── src/
│       ├── App.jsx                      ← role-prefixed routes + DashboardRedirect
│       ├── index.js  /  index.css  /  App.css
│       ├── pages/
│       │   ├── Landing.jsx
│       │   ├── auth/
│       │   │   ├── Login.jsx
│       │   │   └── Signup.jsx
│       │   └── dashboard/
│       │       ├── SchoolView.jsx          (principal — risk gauge + bundles)
│       │       ├── DEODashboard.jsx        (deo / admin — predictive queue)
│       │       ├── ContractorDashboard.jsx (contractor field console)
│       │       ├── WeeklyInputForm.jsx     (peon entry — bundled submit)
│       │       ├── WorkOrders.jsx          (contractor / deo / admin)
│       │       ├── ConditionLogView.jsx    (principal & DEO bundle list)
│       │       ├── GeospatialMap.jsx       (Leaflet + cluster + heatmap)
│       │       └── AuditLogView.jsx        (admin immutable log)
│       ├── components/
│       │   ├── common/                     ← reusable UI primitives
│       │   │   ├── Badge.jsx  Button.jsx  Card.jsx  Input.jsx
│       │   │   ├── MetricCard.jsx  PageHeader.jsx  Select.jsx  MultiSelect.jsx
│       │   │   ├── CompletionModal.jsx     (GPS + photo proof)
│       │   │   ├── EvidenceDrawer.jsx      (slide-out evidence panel)
│       │   │   └── ProtectedRoute.jsx
│       │   ├── deo/
│       │   │   ├── ForwardedReportsPanel.jsx
│       │   │   └── AssignContractorModal.jsx
│       │   ├── principal/
│       │   │   ├── HealthTimeline.jsx        (recharts trend per category)
│       │   │   ├── ApprovalQueue.jsx
│       │   │   ├── ActiveWorkOrders.jsx
│       │   │   ├── AuditCompliance.jsx
│       │   │   └── WeeklyBundleQuickSend.jsx
│       │   ├── layout/
│       │   │   └── AppLayout.jsx           (Govt-of-India tricolor header + role nav + i18n switcher)
│       │   ├── landing/                    (Hero2, Features2, HowItWorks2,
│       │   │                                AppPreview, GovSchemes, CTA,
│       │   │                                Navbar, Footer, DownloadSection,
│       │   │                                Testimonials)
│       │   └── ui/                         (legacy primitives)
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   ├── LanguageContext.jsx          (en / hi / gu translations)
│       │   └── translations.js
│       ├── hooks/
│       │   └── useSocket.js                 (singleton Socket.IO client)
│       ├── services/api.js
│       └── utils/
│           └── roleRoutes.js                (dashboardPathFor / roleSubPath)
│
└── backend/                             ← Express + Mongoose API
    ├── server.js                        ← app entry, route mounting, Socket.IO bootstrap
    ├── seed.js                          ← (legacy — replaced by /api/seed-demo)
    ├── package.json
    ├── .env  /  .env.example
    ├── data/                            ← `lr-models.json` written by trainLR.js
    ├── config/
    │   ├── database.js                  ← mongoose.connect wrapper
    │   ├── multer.js                    ← memory storage, image filter, 10 MB
    │   └── cloudinary.js                ← cloudinary v2 SDK config
    ├── middlewares/
    │   └── auth.middleware.js           ← protect + authorize(...roles)
    ├── middleware/
    │   └── rateLimiter.js               ← 200 req / 15 min
    ├── socket/
    │   ├── index.js                     ← Socket.IO init + JWT auth + room joins
    │   └── events.js                    ← event-name constants
    ├── controllers/
    │   ├── auth.controller.js           profile.controller.js
    │   ├── admin.controller.js          school.controller.js
    │   ├── report.controller.js         ← runs heuristic + LR on submit
    │   ├── risk.controller.js           ← queue, heatmap, timeline
    │   ├── workorder.controller.js      ← assign / complete / respond / details
    │   ├── alert.controller.js          analytics.controller.js
    │   ├── maintenance.controller.js    schoolCondition.controller.js
    │   ├── image.controller.js          (legacy MongoDB image stream)
    │   └── seed.controller.js
    ├── routes/
    │   ├── auth.routes.js   profile.routes.js   admin.routes.js
    │   ├── school.routes.js  report.routes.js    risk.routes.js
    │   ├── task.routes.js                          ← canonical work-order routes
    │   ├── workorder.routes.js                     ← retired alias
    │   ├── alert.routes.js  analytics.routes.js    maintenance.routes.js
    │   ├── schoolCondition.routes.js
    │   ├── users.routes.js                         ← /api/users/contractors
    │   └── image.routes.js                         ← /api/images/:id (legacy)
    ├── services/
    │   ├── predictionEngine.js          ← heuristic engine (~500 LOC)
    │   ├── lrModel.js                   ← linear-regression inference
    │   ├── reportGenerator.js           ← PDFKit bundled report
    │   └── districtAnalytics.js         ← idempotent district-stats recompute
    ├── models/
    │   ├── index.js                     ← central re-export
    │   ├── user.model.js                school.model.js
    │   ├── school-condition-record.model.js
    │   ├── maintenance-decision.model.js work-order.model.js
    │   ├── repair-log.model.js          alert.model.js
    │   ├── district-analytics.model.js  priorityConfig.model.js
    │   ├── audit-log.model.js           ← 90-day TTL audit collection
    │   └── report-image.model.js        ← legacy MongoDB-stored bytes
    ├── Methods/
    │   └── bcryptPassword.js
    ├── utils/
    │   └── auditLogger.js               ← writeAuditLog() fire-and-forget
    ├── scripts/
    │   ├── loadCSV.js                   trainLR.js
    │   ├── clearAll.js  clearDB.js  clearReports.js
    │   ├── cleanupCollections.js  dropWeekUniqueIndex.js
    │   ├── checkMongo.js  listCollections.js
    │   ├── latestActivity.js  resetForwarding.js  smokeTest.js
    │   └── verify_gps.js
    ├── test_images/
    └── uploads/                         ← reports/ subdir for transient PDFs
```

---

## 4. Technology Stack

### Frontend (`frontend/package.json`)

| Package | Version | Purpose |
|---|---|---|
| react / react-dom | ^18.2.0 | UI framework |
| react-router-dom | ^6.18.0 | Client-side routing |
| react-is | ^19.2.5 | recharts compat |
| recharts | ^3.8.1 | Health-timeline charts |
| framer-motion | ^12.38.0 | Animations |
| lucide-react | ^1.8.0 | Icon library |
| leaflet | ^1.9.4 | Interactive maps |
| react-leaflet | ^4.2.1 | React wrapper for Leaflet |
| react-leaflet-cluster | ^3.1.1 | Marker clustering |
| leaflet.markercluster | ^1.5.3 | Cluster engine |
| leaflet.heat | ^0.2.0 | Heatmap overlay |
| socket.io-client | ^4.8.3 | Real-time push |
| vite (dev) | ^5.0.8 | Build / dev server |
| tailwindcss (dev) | ^3.4.0 | Utility CSS |
| @vitejs/plugin-react (dev) | ^4.2.1 | React Fast Refresh |
| autoprefixer / postcss (dev) | — | CSS pipeline |

### Backend (`backend/package.json`)

| Package | Version | Purpose |
|---|---|---|
| express | ^4.18.2 | HTTP server |
| mongoose | ^7.6.3 | MongoDB ODM |
| socket.io | ^4.8.3 | WebSocket / push channel |
| jsonwebtoken | ^9.0.3 | JWT signing / verifying |
| bcryptjs | ^3.0.3 | Password hashing |
| cookie-parser | ^1.4.7 | HttpOnly cookie parsing |
| cors | ^2.8.5 | CORS middleware |
| dotenv | ^16.3.1 | Env var loading |
| multer | ^1.4.5-lts.1 | File upload (memory storage) |
| express-rate-limit | ^8.3.1 | API rate limiting |
| cloudinary | ^2.9.0 | Image + PDF object storage |
| pdfkit | ^0.18.0 | Server-side PDF generation |
| uuid | ^13.0.0 | Unique IDs |
| nodemon (dev) | ^3.0.1 | Auto-reload |

### Database
- **MongoDB Atlas** — 11 active collections (see §6).

---

## 5. Backend Architecture

### 5.1 Server Bootstrap (`backend/server.js`)

- ES modules (`"type": "module"`).
- Wraps Express in a Node `http` server so Socket.IO can attach.
- Connects to MongoDB via `config/database.js`, then calls `initSocket(httpServer)`.
- Global middleware: `cookieParser`, `cors` (origins: `localhost:5173`, `localhost:5174`, `FRONTEND_URL`), `express.json`, `express.urlencoded`, `apiLimiter` on `/api/*`.
- Static `/uploads/*` serves transient files from `backend/uploads/` (PDFs are uploaded to Cloudinary; only short-lived temp files live here).
- **Health endpoint** `GET /health` returns version + cheat-sheet of routes.
- **Demo seed** `GET /api/seed-demo` (no auth) — wipes & reseeds users, schools, sample records, alerts, work orders.
- **Wipe data** `GET /api/wipe-data` — clears condition records / decisions / alerts / analytics (keeps users + schools).
- 14 route modules mounted (see §13) plus 2 legacy aliases (`/api/condition-report`, `/api/risk-scores`, `/api/work-orders`).
- Centralised error handler (handles `MulterError` specially).

### 5.2 Authentication & Authorization

**Controller:** `controllers/auth.controller.js` · **Middleware:** `middlewares/auth.middleware.js`

| Route | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Hash password (bcrypt 10 rounds), create user, issue JWT cookie |
| `/api/auth/login` | POST | Validate, set HttpOnly cookie `token` |
| `/api/auth/logout` | POST | Clear cookie |
| `/api/auth/me` | GET | Returns current user (reads cookie OR `Authorization: Bearer`) |

- **JWT** — 7-day default expiry (`JWT_EXPIRE`), secret from `JWT_SECRET`.
- **Cookie** — HttpOnly, `sameSite: 'lax'`, `secure` in prod.
- `protect` middleware decodes token → `req.user = { id, role }`.
- `authorize(...roles)` middleware restricts to allowed roles.
- **Roles enum:** `peon` · `principal` · `deo` · `contractor` · `admin`.

### 5.3 User Profiles (`/api/me`)

All routes require `protect`:
- `GET /api/me/` — own profile (schoolId populated)
- `PUT /api/me/` — update name / phone / district
- `PUT /api/me/password` — change password (verifies current)

### 5.4 Schools (`/api/schools`)

- `GET /` — list all schools (aggregates condition records + joins `schools` collection for name + `location.lat/lng`)
- `GET /:id` — single school by numeric `schoolId`

### 5.5 Users (`/api/users`)

- `GET /api/users/contractors` — DEO + admin only — returns name / email / phone of every contractor account (used by the Assign-Contractor modal).

### 5.6 Condition Reports (`/api/reports`, alias `/api/condition-report`)

**File:** `controllers/report.controller.js`

| Route | Description |
|---|---|
| `POST /` | Single-category submit; runs heuristic + LR engine, persists scores, emits Socket.IO event, writes audit log, fires-and-forgets district analytics recompute. Photos required for `peon` role. |
| `POST /weekly` | **Bundled submit** — accepts `categories[]` JSON + `image_plumbing` + `image_electrical` + `image_structural` files in one multipart call; produces 3 records sharing `{schoolId, weekNumber}`. |
| `GET /` | List with filters: `schoolId`, `district`, `category`, `weekNumber`, `limit`. |
| `GET /stats?schoolId=` | 52-week presence vector — used by principal calendar to show "submitted vs missing". |
| `GET /weekly/bundles?schoolId=` (principal) `?forwardedOnly=true&district=` (DEO) | Returns weekly bundles grouped by `{schoolId, weekNumber}`, ranked by **LR urgency**. |
| `GET /:school_id` | All records for one school. |
| `PATCH /:id/review` | Principal / DEO / admin add a review note; emits `report:reviewed`. |
| `POST /:id/forward` | Principal forwards a single record to DEO; auto-creates / upserts `MaintenanceDecision`; emits `report:forwarded` to DEO room. |
| `POST /weekly/:schoolId/:weekNumber/forward` | **Bundled forward** — marks every category record forwarded, creates decisions, emits one `report:forwarded:bundle` event. |
| `GET /:id/pdf` | Generates the bundled PDF (heuristic + LR sections + photos), uploads to Cloudinary, redirects to the secure URL. |

### 5.7 Risk Scores (`/api/risk`, alias `/api/risk-scores`)

**File:** `controllers/risk.controller.js`

| Route | Description |
|---|---|
| `GET /all` | Latest predictions per (school, category) — uses **stored** values (fast). |
| `GET /queue` | District-level aggregated queue — joins `MaintenanceDecision` + `School` + `SchoolConditionRecord`, groups by `schoolId`, flattens up to 5 evidence items, supports `district` / `block` / `category` / `urgency` (default 365 d). Primary DEO endpoint. |
| `GET /heatmap` | DEO + admin — geo-aggregated open decisions with `lat / lng / maxPriorityScore` for the map. |
| `GET /` | Legacy aggregation. |
| `GET /:school_id` | **Live engine call** — full week history per category, runs heuristic engine, returns full `evidence[]`. |
| `GET /:school_id/timeline` | Per-week health series for the principal trend chart (one line per category). |

`/all`, `/queue`, `/heatmap` are registered **before** `/:school_id` to avoid route shadowing.

### 5.8 Tasks / Work Orders (`/api/tasks`, alias `/api/work-orders`)

**File:** `controllers/workorder.controller.js`

| Route | Description |
|---|---|
| `GET /` | List tasks. Contractors see only their own; supports `status` / `schoolId` / `district` / `locationMismatch=true` filters. The mismatch filter triggers an aggregation that joins `schools` + `users` so the DEO sees coords & contractor name. |
| `POST /assign` | DEO/BMO/admin create a work order; auto-resolves the latest pending `MaintenanceDecision` if `decisionId` not supplied, marks the decision `assigned`, emits `task:assigned` to contractor room + DEO district room + admin. |
| `POST /complete` | **PS-03 completion flow** (see §5.8.1). |
| `PATCH /:id/status` | DEO / admin update status. |
| `PATCH /:id/respond` | Contractor accept / reject — `scope: 'school'` accepts only that one; `scope: 'district'` bulk-accepts every pending/assigned task in the same district for that contractor. |
| `GET /:id/details` | Full work-order context: school metadata, source `SchoolConditionRecord`, LR analysis, peon-uploaded photos and a human-readable issues list (waterLeak / wiringExposed / wallSeepage / pestInfestation / crack > 5mm / toilets < 50 % functional / outage > 8h / etc). |

#### 5.8.1 Completion Flow (`POST /api/tasks/complete`)
1. Verify caller is the assigned contractor (or DEO/admin).
2. Upload completion photo to Cloudinary (`saksham/completion_proofs/`).
3. Haversine distance vs `School.location` → if > 5 km, set `locationMismatch = true`.
4. Mark work order `completed`, set `completedAt`, store `completionProof.{photoUrl, gpsLocation}`.
5. **If mismatch**, create an `Alert` of type `GPS_MISMATCH` and emit a real-time event to the DEO room.
6. Build a `RepairLog` with before/after condition scores, `completionTimeDays`, `slaBreached` (deadline crossed?), `locationMismatch`.
7. Mark the linked `MaintenanceDecision.status = 'completed'`.
8. Emit `task:completed` to DEO room + admin room and write an audit log.

### 5.9 Alerts (`/api/alerts`)

- `GET /` — unresolved alerts, filter by `district` / `type`.
- `GET /digest` — counts grouped by `{district, category}` with templated message.
- `PATCH /:id/read` — mark resolved.

**Alert types:** `FAILURE_30_DAYS` · `FAILURE_60_DAYS` · `HIGH_PRIORITY` · `GPS_MISMATCH`

### 5.10 Analytics (`/api/analytics`)

- `GET /` — list district analytics (filter by `district`).
- `POST /update` — manual stats overwrite for a district.
- `POST /recompute` — DEO + admin — rebuilds `district_analytics` from current records using `recomputeAllDistricts()`.
- `GET /model-accuracy` — DEO + admin — per-category and per-district aggregates of `RepairLog.predictionError` (mean abs error, mean condition delta, accuracy breakdown overestimated / accurate / underestimated).

### 5.11 Maintenance (`/api/maintenance`)

- `GET /decisions` — filter by `schoolId` / `status` / `category`.
- `POST /decisions` — create a `MaintenanceDecision`.
- `PATCH /decisions/:id` — admin / DEO / **principal** update status (principal can `approve`).
- `POST /work-orders` — raw work-order create.
- `POST /repair-logs` — create a `RepairLog` with **full prediction feedback**: fetches history → runs heuristic engine → stores `predictionSnapshot` + computes `predictionError` (`conditionDelta`, `riskScoreDelta`, `accuracy`).

### 5.12 School Conditions (`/api/school-conditions`)

- `GET /` — list raw `SchoolConditionRecord`s.
- `POST /` — peon / principal / deo / admin create a raw record.

### 5.13 Admin (`/api/admin`)

Router-level `protect + authorize('admin', 'deo')`:

| Route | Roles | Description |
|---|---|---|
| `GET /stats` | admin | System-wide counts including `slaBreaches` and `failuresWithin30Days`. |
| `GET /users` | admin | All users. |
| `DELETE /users/:id` | admin | Delete user. |
| `GET /load-csv` | admin | Spawns `scripts/loadCSV.js` as a child process; returns 202. |
| `GET /priority-config` | DEO + admin | Read active `PriorityConfig`. |
| `PUT /priority-config` | admin | Activate new config (deactivates the old via partial unique index), flushes engine cache. |
| `GET /audit-logs` | admin | Paginated audit log with `role` / `action` / `startDate` / `endDate` filters; joins actor name. |

### 5.14 Images (`/api/images/:id`)

Streams a peon-uploaded image straight from MongoDB (`ReportImage.data` Buffer). Kept for **legacy** records. New uploads go to Cloudinary instead.

### 5.15 File Uploads (`config/multer.js`)

- **Memory storage** (`multer.memoryStorage()`) — bytes go directly to Cloudinary or MongoDB; nothing is written to local disk.
- MIME + extension filter for jpeg / jpg / png / gif / bmp / webp.
- Size limit: 10 MB per image.

### 5.16 Rate Limiting (`middleware/rateLimiter.js`)

- **Window:** 15 minutes · **Max:** 200 requests per IP.
- Applied globally to `/api/*`.

---

## 6. Database Models & Schemas

11 active collections under `backend/models/`, re-exported from `models/index.js`.

### 6.1 `user.model.js` → `users`

| Field | Type | Notes |
|---|---|---|
| `name` | String | required, trimmed |
| `email` | String | required, **unique**, lowercase |
| `password` | String | required, bcrypt-hashed |
| `role` | enum | `peon` \| `principal` \| `deo` \| `contractor` \| `admin` (default: `peon`) |
| `district` | String | optional |
| `phone` | String | optional |
| `schoolId` | Number | numeric CSV school ID (peon / principal) |
| timestamps | Date | `createdAt`, `updatedAt` |

### 6.2 `school.model.js` → `schools`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | Number | **unique**, indexed |
| `name` / `district` / `block` | String | district indexed |
| `schoolType` | enum | `Primary` \| `Secondary` |
| `isGirlsSchool` | Boolean | |
| `numStudents` | Number | |
| `infrastructure.{buildingAge, materialType, weatherZone}` | mixed | |
| `location.{lat, lng}` | Number | defaults 23.8 / 69.5 (Kutch) — used for Haversine GPS validation |
| `isActive` | Boolean | default true |

**Indexes:** `{schoolId}` unique · `{district, block}`.

### 6.3 `school-condition-record.model.js` → `school_condition_records`

The main event-stream of weekly inputs.

| Field group | Fields |
|---|---|
| Identity | `schoolId`, `schoolRef → School`, `district`, `block`, `schoolType`, `isGirlsSchool`, `numStudents` |
| Building | `buildingAge`, `materialType` (RCC \| Brick \| Mixed \| Temporary), `weatherZone` (Dry \| Heavy Rain \| Coastal \| Tribal) |
| Time | `category` (plumbing \| electrical \| structural), `weekNumber` |
| Condition | `conditionScore` 1–5 |
| Issue flags | `issueFlag`, `waterLeak`, `wiringExposed`, `roofLeakFlag`, `brokenTap`, `cloggedDrain`, `tankOverflow`, `lowWaterPressure`, `wallSeepage`, `brokenDoor`, `brokenWindow`, `pestInfestation` |
| Numeric flags | `crackWidthMM`, `toiletFunctionalRatio` (0–1), `powerOutageHours` (per week) |
| Photos | `photoUploaded`, `images[]` (Cloudinary URLs or `/api/images/:id`) |
| Heuristic predictions | `daysToFailure`, `willFailWithin30Days`, `willFailWithin60Days`, `priorityScore` |
| **LR predictions** | `lrPriorityScore`, `lrDaysToFailure`, `lrFail30Probability`, `lrFail60Probability`, `lrUrgencyFactor`, `lrUrgencyLabel` (low/medium/high/critical), `lrModelVersion` |
| Repair / SLA | `repairDone`, `daysSinceRepair`, `contractorDelayDays`, `slaBreach` |
| Workflow | `reviewNote`, `reviewedBy → User`, `reviewedAt`, `forwardedAt`, `forwardedBy → User` |

**Indexes:** `{schoolId, category, weekNumber}` (non-unique — testing mode allows multiple submissions per week) and `{schoolId, district, category}`.

### 6.4 `maintenance-decision.model.js` → `maintenance_decisions`

| Field | Notes |
|---|---|
| `recordId → SchoolConditionRecord` | required |
| `schoolId`, `district`, `category`, `weekNumber` | required |
| `decision.computedPriorityScore` | indexed descending |
| `decision.priorityLevel` | low \| medium \| high \| urgent |
| `impact.{studentsAffected, isGirlsSchool, criticalFacility}` | impact context |
| `explainability.reasons[]` | human-readable bullets |
| `status` | pending \| approved \| assigned \| completed (default `pending`) |

**Indexes:** `{decision.computedPriorityScore: -1}` and `{schoolId, category, status}`.

### 6.5 `work-order.model.js` → `work_orders`

| Field | Notes |
|---|---|
| `decisionId → MaintenanceDecision` | optional |
| `schoolId`, `district`, `category` | required |
| `assignment.{assignedTo → User, assignedBy → User}` | |
| `priorityScore` | required |
| `status` | pending \| assigned \| **accepted** \| in_progress \| completed \| delayed \| cancelled |
| `deadline` | required Date |
| `startedAt`, `completedAt` | lifecycle |
| `completionProof.{photoUrl, gpsLocation.{lat,lng}}` | |
| `locationMismatch` | Boolean (Haversine flag) |

**Index:** `{assignment.assignedTo, status}`.

### 6.6 `repair-log.model.js` → `repair_logs`

PS-03 **learning feedback loop** — every completed repair stores the engine's pre-repair forecast vs the actual post-repair condition.

| Field group | Notes |
|---|---|
| Identity | `workOrderId`, `decisionId`, `schoolId`, `category` |
| Before / After | `before.conditionScore`, `before.issues` (mixed), `after.conditionScore` |
| SLA | `completionTimeDays`, `contractorDelayDays`, `slaBreached`, `locationMismatch`, `photoUrl` |
| `predictionSnapshot` | `riskScore`, `riskLevel`, `estimatedDaysToFailure`, `within30Days`, `within60Days`, `deteriorationRate`, `evidence[]` |
| `predictionError` | `beforeConditionScore`, `afterConditionScore`, `conditionDelta` (>0 = improved), `riskScoreDelta`, `accuracy` (`overestimated` \| `accurate` \| `underestimated`) |

**Index:** `{schoolId, createdAt: -1}`.

### 6.7 `alert.model.js` → `alerts`

| Field | Notes |
|---|---|
| `schoolId`, `district`, `category` | required |
| `type` | `FAILURE_30_DAYS` \| `FAILURE_60_DAYS` \| `HIGH_PRIORITY` \| `GPS_MISMATCH` |
| `message` | required |
| `isResolved` | indexed, default false |

### 6.8 `district-analytics.model.js` → `district_analytics`

| Field | Notes |
|---|---|
| `district` | indexed |
| `totalSchools`, `avgConditionScore`, `highPriorityCount` | aggregates |
| `failureWithin30DaysCount`, `failureWithin60DaysCount` | LR-driven counts |
| `categoryBreakdown.{plumbing, electrical, structural}` | high-priority counts |
| `slaBreachCount` | from `WorkOrder` aggregation (completed late OR open + overdue) |
| `generatedAt` | last refresh |

Refreshed by `services/districtAnalytics.js` after every submit / forward.

### 6.9 `priorityConfig.model.js` → `priority_config`

Dynamic, hot-reloadable engine configuration. `conditionWeights.{good,minor,major,critical}`, `multipliers.{girlsSchool=1.5, criticalFacility=1.6, studentImpact=1.4}`, `maxPriorityScore=100`, `version`, `isActive`, `updatedBy → User`.

**Partial unique index:** only **one** doc may have `isActive: true`.

### 6.10 `audit-log.model.js` → `auditlogs`

Append-only. Used by `writeAuditLog()` after every state-changing controller call.

| Field | Notes |
|---|---|
| `actorId → User`, `actorRole`, `action`, `targetCollection`, `targetId` | |
| `metadata` | mixed payload |
| `ip`, `userAgent` | |
| `createdAt` | TTL = 7,776,000 s (90 days) — auto-purges |

**Indexes:** `{actorId, createdAt: -1}`, `{action, createdAt: -1}`.

### 6.11 `report-image.model.js` → `report_images`

Legacy — bytes stored as `Buffer` in MongoDB so an older deployment with no Cloudinary credentials can still serve uploaded photos via `/api/images/:id`. New code uploads to Cloudinary instead.

---

## 7. Prediction Stack (Heuristic + Linear Regression)

The system runs **two engines in parallel** on every peon submission. The LR model dominates the queue ordering when present; the heuristic engine always supplies cited evidence.

### 7.1 Heuristic engine — `services/predictionEngine.js`

Fully explainable, per-category risk scoring. Every factor that influences the score produces a named entry in the returned `evidence[]` array — no black-box scoring.

**Scoring pipeline:**
1. Condition base (0–50) — avg `conditionScore` over last 3 weeks, linearly mapped.
2. Poor-reading bonus (0–20) — count of weeks with score ≥ 4.
3. Trend bonus (0–15) — +15 if latest > oldest (worsening).
4. Building-age multiplier — 5 tiers from ×0.80 (<10 y) to ×1.25 (40+ y).
5. Weather-zone multiplier — Dry ×0.90, Heavy Rain ×1.15, Coastal ×1.10, Semi-Arid ×0.95, Tribal ×1.00.
6. Flag boosts — `waterLeak`, `wiringExposed`, `roofLeakFlag`, `issueFlag`, `crackWidthMM`, `toiletFunctionalRatio`, `powerOutageHours` each contribute and emit an evidence item.
7. Girls' school plumbing multiplier — ×1.5 for plumbing only (PS-03 mandate).
8. Student count multiplier — proportional, capped at ×1.30.

**Deterioration analysis (linear regression on weekly history):**
- `deteriorationSlope(weekHistory)` — slope in score-units / week.
- `projectDaysToFailure(slope)` — extrapolates when score crosses failure threshold.
- Returns `within_30_days` / `within_60_days` flags.

**Dynamic config:** Loads active `PriorityConfig` from DB on first call (module cache). `invalidateConfigCache()` is called after `PUT /api/admin/priority-config`. Falls back to `DEFAULT_CONFIG` if no active doc.

### 7.2 Linear-regression engine — `services/lrModel.js`

A 17-feature linear-regression model trained offline by `scripts/trainLR.js` against the 50,000-row TS-PS3.csv. Coefficients persist to `backend/data/lr-models.json` and are loaded once at startup.

**Sub-models** (all share the same feature matrix):
- `priority_score` (0–100)
- `days_to_failure` (real)
- `failure_within_30_days` (linear → sigmoid → probability)
- `failure_within_60_days` (linear → sigmoid → probability)

**Features:** `conditionScore`, `buildingAge`, `numStudents`, `isGirlsSchool`, `waterLeak`, `wiringExposed`, `roofLeakFlag`, `issueFlag`, `crackWidthMM`, `toiletFunctionalRatio`, `powerOutageHours`, weather one-hot (Heavy Rain / Coastal / Semi-Arid / Tribal — Dry as reference), category one-hot (electrical / structural — plumbing as reference).

**Training math:** closed-form OLS with ridge `λ = 1e-3` (β = (XᵀX + λI)⁻¹ Xᵀy), implemented from scratch — no external ML deps.

**Inference output:**
```js
{
  source: 'LR', modelVersion, trainedOnRows,
  priorityScore, daysToFailure,
  willFailWithin30Days, willFailWithin60Days,
  fail30Probability, fail60Probability,
  urgencyFactor,        // priorityScore + boosts for imminent failure
  urgencyLabel,         // critical | high | medium | low
}
```

### 7.3 How they combine on submit

Both engines run after every `POST /api/reports` and `POST /api/reports/weekly`. The persisted record stores BOTH outputs:
- `priorityScore` ← `lr.urgencyFactor` (with heuristic fallback)
- `daysToFailure` ← `lr.daysToFailure` (with heuristic fallback)
- `willFailWithin30Days` / `willFailWithin60Days` ← LR with heuristic fallback
- All 7 `lr*` fields stored verbatim for audit / model-version tracking.

The DEO queue (`/api/risk/queue`), DEO bundle list (`/api/reports/weekly/bundles?forwardedOnly=true`), and `district_analytics` all sort on the LR urgency factor. The `evidence[]` array shown in the UI always comes from the heuristic engine (cited).

---

## 8. Real-time Layer (Socket.IO)

`backend/socket/index.js` initialises Socket.IO right after `mongoose.connect` resolves.

### 8.1 Authentication

Client connects → emits `authenticate` with the JWT cookie value → server `jwt.verify`s and joins role-based rooms:

| Role | Room |
|---|---|
| `peon` / `principal` | `school:<schoolId>` |
| `deo` | `deo:<district>` |
| `contractor` | `contractor:<userId>` |
| `admin` | `admin` |

### 8.2 Events emitted (`socket/events.js`)

| Event | Trigger | Audience |
|---|---|---|
| `report:submitted` | new condition record | school room + admin |
| `report:reviewed` | principal / DEO leaves a note | school room |
| `report:forwarded` | single record forwarded | DEO district room + admin |
| `report:forwarded:bundle` | bundled forward | DEO district room + admin |
| `maintenance:created` | new `MaintenanceDecision` (from forward) | DEO district room + admin |
| `task:assigned` | DEO creates a work order | contractor room + DEO district room + admin |
| `contractor:decision` | accept / reject (school or district scope) | DEO district room + admin |
| `task:completed` | contractor marks complete | DEO district room + admin |
| `audit:event` | every `writeAuditLog()` call | admin |

### 8.3 Frontend client (`hooks/useSocket.js`)

Singleton on `window.__sakshamSocket` — only one connection per browser session, even across React re-mounts. Authenticates on connect, never disconnects on unmount.

---

## 9. Audit Logging & PDF Reports

### 9.1 Audit logger (`utils/auditLogger.js`)

`writeAuditLog(req, action, targetCollection, targetId, metadata)` — fire-and-forget. Inserts an `AuditLog` doc, then emits `audit:event` to the admin room so the live `AuditLogView.jsx` renders the new row immediately. Logs auto-expire after 90 days via Mongo TTL.

Currently fires for: `report_submitted`, `weekly_report_submitted`, `report_reviewed`, `report_forwarded`, `weekly_report_forwarded`, `report_downloaded`, `task_assigned`, `task_accepted`, `task_accepted_district`, `task_rejected`, `task_completed`.

### 9.2 PDF report generator (`services/reportGenerator.js`)

`GET /api/reports/:id/pdf` produces a 5-section A4 PDF for a school + week:

1. **Section 1 — Condition Summary (all categories)** — table of rating, 8-week trend, issue flags, risk score.
2. **Section 1b — LR Model Urgency** — per-category LR urgency factor, label, days-to-failure, P(fail<30d), P(fail<60d).
3. **Section 2 — Heuristic ML Prediction (evidence-cited)** — risk level, predicted failure date, top 5 evidence bullets.
4. **Section 3 — Category Details & Evidence Photos** — issue text + embedded photos (Cloudinary or legacy MongoDB stream).
5. **Section 4 — Principal Notes**.
6. **Section 5 — Audit Trail** — submitted at, reviewed by, forwarded to DEO, photo count.

Robust image embedding: forces `f_jpg,q_auto` Cloudinary transform (PDFKit only embeds JPEG/PNG), falls back to `https.get` when global `fetch` is unavailable, caches downloads per-PDF run. Final PDF is uploaded to Cloudinary `saksham/pdf_reports/` and the local temp file deleted.

---

## 10. Cloudinary Image Pipeline

`config/cloudinary.js` instantiates the v2 SDK with `CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET`.

| Use | Folder | Triggered by |
|---|---|---|
| Peon condition photos | `saksham/reports/` | `POST /api/reports` & `POST /api/reports/weekly` |
| Contractor completion proofs | `saksham/completion_proofs/` | `POST /api/tasks/complete` |
| Generated PDFs (raw resource) | `saksham/pdf_reports/` | `GET /api/reports/:id/pdf` |

Multer uses **memory storage**, so the bytes never touch local disk on a hosted backend — they go straight from the browser into Cloudinary.

Legacy code paths (`/api/images/:id`, `/uploads/<filename>`) are still served for backwards compatibility with older records.

---

## 11. Frontend Architecture

### 11.1 Routing (`src/App.jsx` + `src/utils/roleRoutes.js`)

Each role has its **own URL prefix** (`/peon/dashboard`, `/principal/dashboard`, …). Old `/dashboard` URLs forward to the role-prefixed home via a `DashboardRedirect`.

| Role | Home | Subroutes |
|---|---|---|
| `peon` | `/peon/dashboard` → `WeeklyInputForm` | — |
| `principal` | `/principal/dashboard` → `SchoolView` | `/reports` (`ConditionLogView`), `/report` (`WeeklyInputForm`) |
| `deo` | `/deo/dashboard` → `DEODashboard` | `/map`, `/work-orders`, `/work-orders/new`, `/reports` |
| `contractor` | `/contractor/dashboard` → `ContractorDashboard` | `/work-orders` |
| `admin` | `/admin/dashboard` → `DEODashboard` | `/map`, `/work-orders`, `/audit` (`AuditLogView`) |

### 11.2 Authentication Context (`src/context/AuthContext.jsx`)

`AuthProvider` wraps the whole app and exposes `useAuth()`:

| API | Description |
|---|---|
| `user` | Current user (null if signed out) |
| `loading` | True during initial session restore |
| `login(email, password)` | POST `/api/auth/login` |
| `signup(data)` | POST `/api/auth/register` |
| `logout()` | POST `/api/auth/logout` |
| `updateUser()` | Refresh from `/api/auth/me` |

On mount it calls `GET /api/auth/me` with `credentials: 'include'` to restore the session from the HttpOnly cookie.

### 11.3 API Service (`src/services/api.js`)

Reads `VITE_API_URL` (default `http://localhost:5000`). All helpers send `credentials: 'include'`:

`get` · `post` · `put` · `patch` · `del` · `postFile` (multipart, no `Content-Type` header).

### 11.4 Layout (`components/layout/AppLayout.jsx`)

- Govt-of-India aesthetic: tricolor strip, "Government of India · भारत सरकार" lockup.
- Pinned top utility bar with **EN / हिन्दी / ગુજરાતી** language switcher (persists in `localStorage`).
- Fixed white header with brand "Saksham · सक्षम · Infrastructure Monitoring System".
- Role-aware navy navigation bar (one set of items per role, see below).
- Profile dropdown (initials avatar, role label, sign-out).
- Mobile slide-down menu.
- Scroll-progress orange bar via framer-motion spring.

**Role-based nav:**

| Role | Nav items |
|---|---|
| `peon` | Dashboard |
| `principal` | Principal Dashboard · View Reports |
| `deo` | Predictive Queue · Forwarded Reports · Live Map · Command Center |
| `contractor` | Field Console · All Orders |
| `admin` | Admin Panel · Live Map · All Orders · Audit Log |

### 11.5 Pages

#### `Landing.jsx`
Marketing site built with Tailwind + framer-motion: Navbar · Hero2 · Features2 · GovSchemes (infinite ticker) · AppPreview (3D phone, ConditionMeter gauge) · HowItWorks2 · Testimonials · DownloadSection (QR reveal + live counter) · CTA · Footer.

#### `auth/Login.jsx`
- 5 sandbox role buttons (auto-fill email + `password123`).
- Error banner.
- Cookie set server-side; redirect to role's dashboard via `dashboardPathFor(user.role)`.

#### `auth/Signup.jsx`
- 5-role selector grid.
- `schoolId` shown only for `peon` / `principal` via `AnimatePresence`.
- Posts to `/api/auth/register`.

#### `dashboard/WeeklyInputForm.jsx` (peon entry point)
- Trilingual labels.
- Header with district / block / building age / students / weather zone.
- 3 category tabs (plumbing / electrical / structural) with category-specific issue checklists (waterLeak, brokenTap, cloggedDrain, tankOverflow, lowWaterPressure, wallSeepage, roofLeakFlag, brokenDoor, pestInfestation; wiringExposed, brokenSwitch, burntSocket, flickeringLights, panelDamage, highVoltage; brokenWindow, paintPeeling, floorDamage, ceilingHole) and category-specific numeric selects (`toiletFunctionalRatio`, `powerOutageHours`, `crackWidthMM`).
- **Mandatory photo per category** for peon role (camera capture button).
- Bundled submit via `postFile()` to `POST /api/reports/weekly`.
- Success screen with per-category saved status.

#### `dashboard/SchoolView.jsx` (principal)
- Fetches `/api/risk/:schoolId` (live engine), `/api/condition-report?schoolId=…`, `/api/schools/:schoolId` in parallel.
- Hero metric cards: Infrastructure Health, Pending Audits, Critical Risks, Audit History.
- `HealthTimeline` (recharts area chart, 1 line per category — uses `/api/risk/:schoolId/timeline`).
- `WeeklyBundleQuickSend` widget — most recent bundle + LR urgency + one-click "Send to DEO".
- `ApprovalQueue` (principal can approve maintenance decisions via `PATCH /api/maintenance/decisions/:id`).
- `ActiveWorkOrders` and `AuditCompliance` panels.

#### `dashboard/DEODashboard.jsx`
Primary DEO interface.
- 4 stat cards: Schools at Risk · Critical · High · Avg Days to Failure.
- Filter bar (district / block / category / urgency).
- Two tabs: **Risk Queue** and **GPS Mismatches** (count badge in header).
- Priority table: school & location, at-risk categories, days to failure (red < 15 d, orange < 30 d, blue otherwise), student impact, evidence-count badge, girls'-school badge, evidence drawer trigger, **Assign** CTA.
- `ForwardedReportsPanel` (right rail) — bundles forwarded by principals, sorted by LR urgency, with one-click "Assign Contractor" (`AssignContractorModal` with auto-suggested deadline by urgency: critical 7 d, high 14 d, medium 30 d, low 60 d).

#### `dashboard/GeospatialMap.jsx` (deo / admin only)
- React-Leaflet `MapContainer` with CartoDB Positron tiles and `react-leaflet-cluster` marker clustering.
- Coloured markers: red (≥80) · orange (≥60) · amber (≥40) · emerald (<40) · slate (no data).
- Click marker → popup with school name, district, risk badge, "View Profile" + "Get Directions" (calls OSRM routing with the user's GPS as origin and draws a `Polyline`).
- 3 metric cards at top: Identification Nodes · Critical Designation · Stable Baseline.
- Map filter chips (Show All / Critical Only).

#### `dashboard/ConditionLogView.jsx` (principal & DEO)
Bundled, LR-prioritised view. Used in two modes:
- **Principal:** one card per week for the principal's school, with "Send to DEO" CTA per bundle and PDF download.
- **DEO:** all forwarded bundles in the district, ranked by LR urgency, with "Assign Contractor" CTA and PDF download.

#### `dashboard/ContractorDashboard.jsx`
Contractor field console.
- Stat cards (assigned / accepted / completed today / SLA breaches).
- Per-task card: category icon, urgency colour strip, deadline countdown ("3d left" / "2d overdue"), status badge, school + assigned-by, "Accept (school)", "Accept all in district", "Reject", "Close Order" (opens `CompletionModal`).
- Pulls from `GET /api/tasks` (auto-scoped to contractor) and uses `GET /api/tasks/:id/details` for the issue list + LR analysis.

#### `dashboard/WorkOrders.jsx`
Generic work-order list (DEO / admin / contractor).
- Status filter tabs with counts.
- SLA metric card when any breached exist.
- DEO: **New Assignment** slide-over (school selector via `/api/schools`, category, priority, contractor via `/api/users/contractors`, due date) — auto-opens when navigated with prefill query params.
- Contractor: **Close Order** → `CompletionModal` (pre/post score selectors, GPS auto-capture, photo upload, `POST /api/tasks/complete` as multipart).

#### `dashboard/AuditLogView.jsx` (admin)
- Filter bar: actor role, action signature, start / end date.
- Live table — subscribes to `audit:event` Socket.IO push so new rows light up as they arrive (5-second highlight).
- Expandable row reveals JSON payload viewer (terminal-style green-on-black).
- Pagination (50/page).

### 11.6 Reusable Components

**`components/common/`**

| File | Description |
|---|---|
| `Badge.jsx` | Variant-driven pill (critical / high / moderate / low / info / warning / success) |
| `Button.jsx` | Multi-variant (primary / ghost / outline / danger / secondary), `isLoading`, sizes |
| `Card.jsx` | Styled container with configurable padding / shadow / hover (gov variant) |
| `Input.jsx` | Text/number input with label + error + icon |
| `Select.jsx` / `MultiSelect.jsx` | Custom selects with chevron, multi-select chips |
| `MetricCard.jsx` | Big-number KPI tile with variant + icon + trend value |
| `PageHeader.jsx` | Title + subtitle + icon + optional `actions` slot |
| `ProtectedRoute.jsx` | Redirects unauthenticated users to `/login`, shows spinner during load |
| `CompletionModal.jsx` | Contractor completion form (GPS auto-capture, photo upload, `multipart` POST) |
| `EvidenceDrawer.jsx` | Modal — school name, at-risk category chips, evidence bullets, methodology note, optional cover photo |

**`components/principal/`**

| File | Description |
|---|---|
| `HealthTimeline.jsx` | recharts AreaChart of `/api/risk/:schoolId/timeline` |
| `WeeklyBundleQuickSend.jsx` | Most recent bundle + LR badge + one-click "Send to DEO" |
| `ApprovalQueue.jsx` | Pending `MaintenanceDecision`s — approve / reject |
| `ActiveWorkOrders.jsx` | Open tasks for the principal's school |
| `AuditCompliance.jsx` | "Submitted vs missing" 52-week vector from `/api/reports/stats` |

**`components/deo/`**

| File | Description |
|---|---|
| `ForwardedReportsPanel.jsx` | Right-rail list of forwarded bundles ranked by LR urgency |
| `AssignContractorModal.jsx` | Auto-suggests deadline by LR urgency, fetches contractor list via `/api/users/contractors`, posts `/api/tasks/assign` |

---

## 12. Internationalisation (EN / HI / GU)

`src/context/LanguageContext.jsx` exposes `useLanguage() → { language, setLanguage, t(key) }`.

- 3 dictionaries (English, Hindi हिन्दी, Gujarati ગુજરાતી) covering 200+ keys per locale.
- Translations cover: navigation, role labels, peon form labels (categories / flags / dropdowns), DEO dashboard, work orders, audit log, landing sections, login / signup, condition log view.
- Selection persisted in `localStorage` (`appLanguage` key) and applied to `<html lang>`.
- Language switcher pinned in the top utility bar.

---

## 13. API Endpoints Reference

### Server-level
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Server status + cheat sheet |
| GET | `/api/seed-demo` | — | Wipe + reseed demo data |
| GET | `/api/wipe-data` | — | Clear records / decisions / alerts (keeps users + schools) |
| GET | `/uploads/:filename` | — | Static (transient) |

### Authentication `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create user, issue JWT cookie |
| POST | `/login` | Validate, set cookie |
| POST | `/logout` | Clear cookie |
| GET | `/me` | Get current user |

### Profile `/api/me` — JWT
| Method | Path | Description |
|---|---|---|
| GET | `/` | Own profile |
| PUT | `/` | Update name / phone / district |
| PUT | `/password` | Change password |

### Schools `/api/schools` — JWT
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all schools (aggregated) |
| GET | `/:id` | School by numeric ID |

### Users `/api/users` — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/contractors` | deo, admin | List contractor accounts |

### Reports `/api/reports` (alias `/api/condition-report`) — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/` | peon, principal, deo, admin | Submit single category (multipart) |
| POST | `/weekly` | peon, principal, deo, admin | Bundled 3-category submit (multipart) |
| GET | `/` | All | List with filters |
| GET | `/stats` | All | 52-week presence vector |
| GET | `/weekly/bundles` | peon, principal, deo, admin | Weekly bundles (principal or DEO mode) |
| GET | `/:school_id` | All | Records for one school |
| PATCH | `/:id/review` | principal, deo, admin | Add review note |
| POST | `/:id/forward` | principal, deo, admin | Forward single record |
| POST | `/weekly/:schoolId/:weekNumber/forward` | principal, admin | Bundled forward |
| GET | `/:id/pdf` | principal, deo, admin, contractor | Download bundled PDF |

### Risk `/api/risk` (alias `/api/risk-scores`) — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/all` | deo, admin, contractor | All predictions (stored values) |
| GET | `/queue` | deo, admin | District-level aggregated queue |
| GET | `/heatmap` | deo, admin | Geo-aggregated open decisions |
| GET | `/` | deo, admin | Legacy aggregation |
| GET | `/:school_id` | All | Live engine per category |
| GET | `/:school_id/timeline` | All | Per-week health series for chart |

### Maintenance Queue
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/maintenance-queue` | deo, bmo, admin, contractor | Alias to `getMaintenanceQueue` |

### Tasks `/api/tasks` (alias `/api/work-orders`) — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` | All | List (contractor-scoped) |
| POST | `/assign` | deo, bmo, admin | Create & assign |
| POST | `/complete` | contractor, deo, admin | Complete with photo + GPS |
| PATCH | `/:id/status` | deo, bmo, admin | Update status |
| PATCH | `/:id/respond` | contractor, deo, admin | Accept (school or district scope) / reject |
| GET | `/:id/details` | All | Full work-order context |

### Alerts `/api/alerts` — JWT
| Method | Path | Description |
|---|---|---|
| GET | `/` | List unresolved (filter `district`, `type`) |
| GET | `/digest` | Aggregate by district + category |
| PATCH | `/:id/read` | Mark resolved |

### Analytics `/api/analytics` — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` | All | District analytics |
| POST | `/update` | All | Manual stats overwrite |
| POST | `/recompute` | deo, admin | Rebuild district analytics |
| GET | `/model-accuracy` | deo, admin | Engine accuracy per category + district |

### Maintenance `/api/maintenance` — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/decisions` | All | List decisions (filter `schoolId`, `status`, `category`) |
| POST | `/decisions` | All | Create decision |
| PATCH | `/decisions/:id` | admin, deo, principal | Update status |
| POST | `/work-orders` | All | Create work order (raw) |
| POST | `/repair-logs` | All | Create repair log + prediction feedback |

### School Conditions `/api/school-conditions` — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` | All | List records |
| POST | `/` | deo, admin, peon, principal | Create record |

### Admin `/api/admin` — JWT + authorize
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/stats` | admin | System-wide counts |
| GET | `/users` | admin | All users |
| DELETE | `/users/:id` | admin | Delete user |
| GET | `/load-csv` | admin | Trigger CSV pipeline |
| GET | `/priority-config` | deo, admin | Get active config |
| PUT | `/priority-config` | admin | Update config + flush cache |
| GET | `/audit-logs` | admin | Paginated audit log |

### Images `/api/images` — public
| Method | Path | Description |
|---|---|---|
| GET | `/:id` | Stream legacy MongoDB-stored image bytes |

---

## 14. CSV Pipeline & Scripts

### 14.1 `scripts/loadCSV.js` — primary data ingestion

Streams `TS-PS3.csv` (~50 000 rows) using Node's `readline` (memory-efficient):

1. Parse each row → validate `school_id`, `week_number`, `category`, `condition_score`.
2. Map to `SchoolConditionRecord` (all fields including dataset's pre-computed `priority_score`, `days_to_failure`, `failure_within_30_days`, `failure_within_60_days`).
3. Batch insert with `ordered: false`.
4. Generate `MaintenanceDecision` for rows with `issueFlag = true` (+ girls'-school plumbing +15 boost).
5. Generate `Alert` rows for `willFailWithin30Days` / `willFailWithin60Days` / `priorityScore ≥ 80`.
6. Compute and upsert `DistrictAnalytics` per district.

Pipeline is idempotent against `{schoolId, category, weekNumber}`.

### 14.2 `scripts/trainLR.js` — LR model training

1. Streams TS-PS3.csv.
2. For each row builds the 17-feature vector (`buildFeatureVector` from `services/lrModel.js`).
3. Fits 4 OLS models (priority / days-to-failure / fail30 / fail60) using closed-form ridge regression.
4. Writes `backend/data/lr-models.json` with coefficients + meta (version, trainedAt, rows, lambda).
5. Prints MAE for each sub-model.

Run with `npm run train-lr`. The backend auto-loads the file at first inference.

### 14.3 Other Scripts

| Script | Purpose |
|---|---|
| `clearAll.js` | Drop everything; `--hard` also drops users/schools |
| `clearDB.js` | Drop all documents from all collections |
| `clearReports.js` | Drop only condition records |
| `cleanupCollections.js` | Targeted cleanup helpers |
| `dropWeekUniqueIndex.js` | One-time migration to drop the legacy unique index |
| `listCollections.js` | List collections with counts + samples |
| `latestActivity.js` | Recent-activity report |
| `resetForwarding.js` | Reset all `forwardedAt` flags |
| `smokeTest.js` | End-to-end API smoke test |
| `verify_gps.js` | Sanity-check GPS coordinates on schools |
| `checkMongo.js` | Verify Mongo connectivity |

### 14.4 NPM Scripts

| Directory | Command | Purpose |
|---|---|---|
| frontend | `npm run dev` | Vite dev server at `:5173` |
| frontend | `npm run build` | Production bundle → `dist/` |
| frontend | `npm run preview` | Preview prod build |
| backend | `npm run dev` | nodemon on `server.js` |
| backend | `npm run start` | `node server.js` |
| backend | `npm run load-csv` | Run `scripts/loadCSV.js` |
| backend | `npm run train-lr` | Re-train LR coefficients |
| backend | `npm run clear` | Soft clear (records / decisions / alerts) |
| backend | `npm run clear:hard` | Hard clear including users + schools |

---

## 15. Environment & Deployment

### Backend `.env`
| Variable | Default | Description |
|---|---|---|
| `PORT` | 5000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `MONGODB_URI` | `mongodb://localhost:27017/predictive_maintenance` | Mongo connection |
| `JWT_SECRET` | *(required)* | JWT signing secret |
| `JWT_EXPIRE` | 7d | Token TTL |
| `FRONTEND_URL` | `http://localhost:5173` | CORS + Socket.IO origin |
| `CLOUDINARY_CLOUD_NAME` | *(required)* | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | *(required)* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | *(required)* | Cloudinary API secret |

### Frontend `.env`
| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Backend base URL (used by REST and Socket.IO) |

### Deployment

- **Frontend** (Vercel) — `vercel.json` sets SPA rewrites (all routes → `index.html`), separate rules for `/avatars/*` and `/assets/*`, build output `dist/`.
- **Backend** — any Node 18+ host (Render, Railway, etc.); requires MongoDB Atlas URI + Cloudinary credentials. The HTTP server hosts both the REST API and the Socket.IO endpoint on the same port.

---

## 16. Demo Accounts

`GET /api/seed-demo` (no auth) seeds these accounts; password `password123` for all.

| Role | Email |
|---|---|
| DEO | `deo@demo.com` |
| Principal | `principal@demo.com` |
| Peon | `peon@demo.com` |
| Contractor | `contractor1@demo.com` |
| Admin | `admin@demo.com` |

The seeder also creates two sample schools (Kutch Primary School #2126, Surat Secondary School #2459), three condition records, two maintenance decisions, one work order, and two `FAILURE_30_DAYS` alerts so the dashboards have data on first boot.

---

*Document generated April 19, 2026 · Saksham (Tarkshaastra) · Predictive Maintenance Engine for School Infrastructure (PS-03)*
