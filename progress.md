# Saksham / Tarkshaastra — Project Progress Report

> **Platform Name:** Saksham (सक्षम — "capable / empowered")
> **Repo:** Tarkshaastra
> **Problem Statement:** TS-03 — Predictive Maintenance Engine for School Infrastructure
> **Stack:** React 18 + Vite · Express 4 + Mongoose 7 · MongoDB
> **Last Updated:** April 18, 2026

---

## Table of Contents

1. [Problem Statement (TS-03) Summary](#1-problem-statement-ts-03-summary)
2. [PS-03 Requirements vs Implementation](#2-ps-03-requirements-vs-implementation)
3. [Repository Structure](#3-repository-structure)
4. [Technology Stack](#4-technology-stack)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Models & Schemas](#6-database-models--schemas)
7. [Prediction Engine Deep Dive](#7-prediction-engine-deep-dive)
8. [Frontend Architecture](#8-frontend-architecture)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [CSV Pipeline & Scripts](#10-csv-pipeline--scripts)
11. [Environment & Deployment](#11-environment--deployment)
12. [Known Gaps & Technical Debt](#12-known-gaps--technical-debt)

---

## 1. Problem Statement (TS-03) Summary

**Domain:** Public Institution · AI / ML
**Geography:** Gujarat (30,000+ government school buildings)

**Core problem:** School repairs happen **reactively** — after visible failure. PS-03 demands a **predictive** maintenance system:

1. Peons / watchmen submit a weekly structured dropdown form (< 2 min)
2. Engine aggregates inputs, learns deterioration patterns by building age, material, and weather zone
3. System flags schools **30–60 days** from critical failure across plumbing, electrical, and structural categories
4. DEO gets a district-level **prioritised maintenance queue**
5. Contractor confirms completion with GPS + photo
6. Repair records feed back into the model (learning loop)

**Roles:** `peon` · `principal` · `deo` · `contractor` · `admin`

---

## 2. PS-03 Requirements vs Implementation

### Fully Implemented

| # | PS-03 Requirement | Status | Where |
|---|---|---|---|
| 1 | Weekly dropdown form (no free text, ≤ 2 min) | Done | `WeeklyInputForm.jsx` |
| 2 | Category-specific prediction (plumbing / electrical / structural) | Done | `predictionEngine.js → predictRiskForCategory()` |
| 3 | Cited evidence on every prediction | Done | `evidence[]` array |
| 4 | Student-impact prioritisation (girls' toilet > storage wall) | Done | `girlsSchool ×1.5` + student multiplier |
| 5 | 30 / 60-day failure horizon per category | Done | `within_30_days`, `within_60_days` |
| 6 | District-level maintenance queue (not alert flood) | Done | `GET /api/risk/queue` aggregated by school |
| 7 | Contractor work-order + photo + GPS completion | Done | `/api/tasks/assign` + `/api/tasks/complete` |
| 8 | Model learns from completed repairs | Done | `RepairLog.predictionSnapshot` + `predictionError` |

### Additional Features Built

- GPS validation via Haversine with 5 km threshold → auto-creates `GPS_MISMATCH` alerts
- Geospatial map view (Leaflet) for DEO / admin
- Dynamic `PriorityConfig` — admin can retune scoring weights without deploy
- CSV bulk pipeline ingests 50,000 rows of `TS-PS3.csv` into 4 collections + auto-generates alerts and district analytics
- SLA breach tracking on work orders
- Rate limiting (200 req / 15 min per IP)
- File upload pipeline (multer, 10 MB image limit)

### Partial / Known Gaps

- No ML-model retraining endpoint (feedback loop logs errors but does not adjust weights automatically)
- `/api/work-orders` is still a legacy alias for `/api/tasks`
- No "GPS mismatch" tab in the DEO UI (alerts only surface in `/api/alerts`)
- No `express-validator` or structured input validation on report / complete endpoints

---

## 3. Repository Structure

```
D:\Tarkshaastra\
├── README.md
├── progress.md                          ← this file
├── remaining.md                         ← backlog / TODO tracker
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
│       ├── App.jsx                      ← router + role-based DashboardIndex
│       ├── index.js  /  index.css  /  App.css
│       ├── pages/
│       │   ├── Landing.jsx
│       │   ├── auth/
│       │   │   ├── Login.jsx
│       │   │   └── Signup.jsx
│       │   └── dashboard/
│       │       ├── SchoolView.jsx          (principal)
│       │       ├── DEODashboard.jsx        (deo / admin)
│       │       ├── WeeklyInputForm.jsx     (peon entry point)
│       │       ├── WorkOrders.jsx          (contractor / deo / admin)
│       │       ├── ConditionLogView.jsx    (principal historical audit)
│       │       └── GeospatialMap.jsx       (leaflet map view)
│       ├── components/
│       │   ├── common/                     ← reusable UI primitives
│       │   │   ├── Badge.jsx  Button.jsx  Card.jsx  Input.jsx
│       │   │   ├── MetricCard.jsx  PageHeader.jsx  Select.jsx
│       │   │   ├── CompletionModal.jsx     (GPS + photo proof)
│       │   │   ├── EvidenceDrawer.jsx      (slide-out evidence panel)
│       │   │   └── ProtectedRoute.jsx
│       │   ├── layout/
│       │   │   └── AppLayout.jsx           (fixed header + role nav)
│       │   ├── landing/                    (Hero2, Features2, HowItWorks2,
│       │   │                                AppPreview, GovSchemes, CTA,
│       │   │                                Navbar, Footer, DownloadSection,
│       │   │                                Testimonials)
│       │   └── ui/                         (legacy primitives — pre-refactor)
│       ├── context/AuthContext.jsx
│       ├── services/api.js
│       └── utils/
│
└── backend/                             ← Express + Mongoose API
    ├── server.js                        ← app entry, route mounting
    ├── seed.js                          ← (legacy seed; see controllers/seed.controller.js)
    ├── package.json
    ├── .env  /  .env.example
    ├── config/
    │   ├── database.js                  ← mongoose.connect wrapper
    │   └── multer.js                    ← disk storage, image filter, 10 MB
    ├── middlewares/
    │   └── auth.middleware.js           ← protect + authorize(...roles)
    ├── middleware/
    │   └── rateLimiter.js               ← 200 req / 15 min
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── profile.controller.js
    │   ├── admin.controller.js
    │   ├── school.controller.js
    │   ├── report.controller.js         ← runs prediction on submit
    │   ├── risk.controller.js
    │   ├── workorder.controller.js      ← assign / complete / list
    │   ├── alert.controller.js
    │   ├── analytics.controller.js
    │   ├── maintenance.controller.js
    │   ├── schoolCondition.controller.js
    │   └── seed.controller.js
    ├── routes/
    │   ├── auth.routes.js   profile.routes.js   admin.routes.js
    │   ├── school.routes.js  report.routes.js    risk.routes.js
    │   ├── task.routes.js                          ← canonical work-order routes
    │   ├── workorder.routes.js                     (retired — server delegates)
    │   ├── alert.routes.js  analytics.routes.js    maintenance.routes.js
    │   └── schoolCondition.routes.js
    ├── services/
    │   └── predictionEngine.js          ← core rule-based AI (~500 LOC)
    ├── models/
    │   ├── index.js                     ← central re-export
    │   ├── user.model.js
    │   ├── school.model.js
    │   ├── school-condition-record.model.js
    │   ├── maintenance-decision.model.js
    │   ├── work-order.model.js
    │   ├── repair-log.model.js
    │   ├── alert.model.js
    │   ├── district-analytics.model.js
    │   ├── priorityConfig.model.js
    │   └── conditionReport.model.js     ← legacy pre-refactor model
    ├── Methods/
    │   └── bcryptPassword.js            ← hash / compare helpers
    ├── scripts/
    │   ├── loadCSV.js                   ← streams TS-PS3.csv
    │   ├── clearDB.js
    │   ├── listCollections.js
    │   └── verify_gps.js
    ├── test_images/
    └── uploads/                         ← served at /uploads/<filename>
```

---

## 4. Technology Stack

### Frontend (`frontend/package.json`)
| Package | Version | Purpose |
|---|---|---|
| react | ^18.2.0 | UI framework |
| react-dom | ^18.2.0 | DOM renderer |
| react-router-dom | ^6.18.0 | Client-side routing |
| framer-motion | ^12.38.0 | Animations / transitions |
| lucide-react | ^1.8.0 | Icon library |
| leaflet | ^1.9.4 | Interactive maps |
| react-leaflet | ^4.2.1 | React wrapper for Leaflet |
| vite | ^5.0.8 (dev) | Build tool + dev server |
| tailwindcss | ^3.4.0 (dev) | Utility-first CSS |
| @vitejs/plugin-react | ^4.2.1 (dev) | React Fast Refresh |
| autoprefixer, postcss | (dev) | CSS pipeline |

### Backend (`backend/package.json`)
| Package | Version | Purpose |
|---|---|---|
| express | ^4.18.2 | HTTP server |
| mongoose | ^7.6.3 | MongoDB ODM |
| jsonwebtoken | ^9.0.3 | JWT signing / verifying |
| bcryptjs | ^3.0.3 | Password hashing |
| cookie-parser | ^1.4.7 | HttpOnly cookie parsing |
| cors | ^2.8.5 | CORS middleware |
| dotenv | ^16.3.1 | Env var loading |
| multer | ^1.4.5-lts.1 | File upload (multipart) |
| express-rate-limit | ^8.3.1 | API rate limiting |
| uuid | ^13.0.0 | Unique IDs |
| nodemon | ^3.0.1 (dev) | Auto-reload |

### Database
- **MongoDB** (Atlas or local) — 9 active collections (see §6)

---

## 5. Backend Architecture

### 5.1 Server Bootstrap (`backend/server.js`)

- ES modules (`"type": "module"`)
- Connects to MongoDB via `config/database.js`
- Global middleware: `cookieParser`, `cors` (origins: `localhost:5173`, `localhost:5174`, `FRONTEND_URL`), `express.json`, `express.urlencoded`
- `apiLimiter` (200 req / 15 min) mounted on `/api/*`
- Static `/uploads/*` serves files from `backend/uploads/`
- **Health endpoint** `GET /health` returns server metadata and a cheat-sheet of routes
- **Demo seed** `GET /api/seed-demo` (no auth) calls `seedDatabase()`
- Route mounts (11 route modules + 2 legacy aliases)
- Centralised error handler (handles `MulterError` specially)

### 5.2 Authentication & Authorization

**Controller:** `controllers/auth.controller.js` · **Middleware:** `middlewares/auth.middleware.js`

| Route | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Hash password (bcrypt, 10 rounds), create user, issue JWT cookie |
| `/api/auth/login` | POST | Validate, set HttpOnly cookie `token` |
| `/api/auth/logout` | POST | Clear cookie |
| `/api/auth/me` | GET | Returns current user (reads cookie OR `Authorization: Bearer`) |

- **JWT** — 7-day default expiry (`JWT_EXPIRE`), secret from `JWT_SECRET`
- **Cookie** — HttpOnly, `sameSite: 'lax'`, `secure` in prod
- **`protect`** middleware decodes token → `req.user = { id, role }`
- **`authorize(...roles)`** middleware restricts to allowed roles
- **Roles enum:** `peon` | `principal` | `deo` | `contractor` | `admin`

### 5.3 User Profiles (`/api/me`)

All routes require `protect`:
- `GET /api/me/` — get own profile (schoolId populated)
- `PUT /api/me/` — update name, phone, district
- `PUT /api/me/password` — change password (verifies current)

### 5.4 Schools (`/api/schools`)

- `GET /api/schools/` — list all schools (aggregated from `SchoolConditionRecord`)
- `GET /api/schools/:id` — single school by numeric `schoolId`

Uses the `School` model for GPS coordinates; aggregates condition data for name/district/maxPriorityScore.

### 5.5 Condition Reports (`/api/reports`, alias `/api/condition-report`)

**File:** `controllers/report.controller.js`

- `POST /` — create or upsert a weekly report, then **immediately runs `predictRiskForCategory()`** and persists `priorityScore`, `daysToFailure`, `willFailWithin30Days`, `willFailWithin60Days` back to the record. Returns both record + full `evidence[]` prediction.
- `GET /` — list with filters: `schoolId`, `district`, `category`, `weekNumber`, `limit`
- `GET /:school_id` — all records for one school

Upsert key: `{schoolId, category, weekNumber}` — re-submitting the same week overwrites.

### 5.6 Risk Scores (`/api/risk`, alias `/api/risk-scores`)

**File:** `controllers/risk.controller.js`

| Route | Description |
|---|---|
| `GET /all` | Latest predictions per school/category — uses **stored** CSV values (fast, no live engine call) |
| `GET /queue` | District-level aggregated queue (primary DEO endpoint) — joins `MaintenanceDecision` + `School` + `SchoolConditionRecord`, groups by `schoolId`, flattens up to 5 evidence items, supports `district` / `block` / `category` / `urgency` filters |
| `GET /` | Legacy aggregation from `SchoolConditionRecord` |
| `GET /:school_id` | **Live engine call** — fetches full week history, runs engine per category, returns full evidence |

`/all` and `/queue` are registered **before** `/:school_id` to avoid route shadowing.

### 5.7 Tasks / Work Orders (`/api/tasks`, alias `/api/work-orders`)

**File:** `controllers/workorder.controller.js`

| Route | Description |
|---|---|
| `GET /` | List tasks (contractors see only their own; DEO/admin see all). Supports `locationMismatch=true` filter via aggregation |
| `POST /assign` | Create a work order; auto-resolves latest pending `MaintenanceDecision` for that school+category if `decisionId` not supplied |
| `POST /complete` | **PS-03 completion flow** — see §5.7.1 |
| `PATCH /:id/status` | DEO / admin update status |

#### 5.7.1 Completion Flow
1. Verify caller is the assigned contractor (or DEO/admin)
2. Haversine distance check vs `School.location` → if > 5 km, set `locationMismatch = true`
3. Auto-create `Alert` of type `GPS_MISMATCH`
4. Mark work order `completed`
5. Build `RepairLog` with before/after condition scores, `completionTimeDays`, `slaBreached`, `locationMismatch`
6. Update `MaintenanceDecision.status = 'completed'`

### 5.8 Alerts (`/api/alerts`)

- `GET /` — unresolved alerts, filter by `district`, `type`
- `GET /digest` — counts by `{district, category}`
- `PATCH /:id/read` — mark resolved

**Alert types:** `FAILURE_30_DAYS` · `FAILURE_60_DAYS` · `HIGH_PRIORITY` · `GPS_MISMATCH`

Auto-generated by `scripts/loadCSV.js` for failure windows & high priority, and by `workorder.controller.completeTask()` for GPS mismatches.

### 5.9 Analytics (`/api/analytics`)

- `GET /` — list district analytics (filter by `district`)
- `POST /update` — recompute district analytics from current records
- `GET /model-accuracy` — **PS-03 learning requirement** — aggregates `RepairLog.predictionError` by category & district, returning `meanAbsoluteError`, `meanConditionDelta`, accuracy breakdown (overestimated / accurate / underestimated)

### 5.10 Maintenance (`/api/maintenance`)

- `POST /decisions` — create a `MaintenanceDecision`
- `POST /work-orders` — create a `WorkOrder` (raw)
- `POST /repair-logs` — create a `RepairLog` with **full prediction feedback**: fetches history → runs engine → stores `predictionSnapshot` + computes `predictionError` (`conditionDelta`, `riskScoreDelta`, `accuracy`)

### 5.11 School Conditions (`/api/school-conditions`)

- `POST /` — create raw `SchoolConditionRecord`
- `GET /` — list all records (both require `protect`)

### 5.12 Admin (`/api/admin`)

Router-level `protect + authorize('admin', 'deo')`:

| Route | Description |
|---|---|
| `GET /stats` | System-wide counts including `slaBreaches` and `failuresWithin30Days` |
| `GET /users` | All users (admin only) |
| `DELETE /users/:id` | Delete user (admin only) |
| `GET /load-csv` | Spawns `loadCSV.js` as child process; returns 202 |
| `GET /priority-config` | Get active `PriorityConfig` (DEO + admin) |
| `PUT /priority-config` | Create new active config, deactivate old one, flush engine cache (admin only) |

### 5.13 File Uploads (`config/multer.js`)

- Disk storage → `backend/uploads/` (auto-created)
- MIME + extension filter for jpeg/jpg/png/gif/bmp/webp
- Size limit: 10 MB
- Served statically at `/uploads/<filename>`

### 5.14 Rate Limiting (`middleware/rateLimiter.js`)

- **Window:** 15 minutes · **Max:** 200 requests per IP
- Applied globally to `/api/*`

---

## 6. Database Models & Schemas

MongoDB collections (9 active + 1 legacy). All files under `backend/models/` and re-exported from `models/index.js`.

### 6.1 `user.model.js` → collection `users`

| Field | Type | Notes |
|---|---|---|
| `name` | String | required, trimmed |
| `email` | String | required, **unique**, lowercase |
| `password` | String | required, bcrypt-hashed |
| `role` | enum String | `peon` \| `principal` \| `deo` \| `contractor` \| `admin` (default: `peon`) |
| `district` | String | optional |
| `phone` | String | optional |
| `schoolId` | Number | numeric CSV school ID (for peon / principal) |
| `createdAt`, `updatedAt` | Date | timestamps |

### 6.2 `school.model.js` → collection `schools`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | Number | **unique**, indexed |
| `name` | String | required |
| `district` | String | required, indexed |
| `block` | String | |
| `schoolType` | enum | `Primary` \| `Secondary` |
| `isGirlsSchool` | Boolean | |
| `numStudents` | Number | |
| `infrastructure.buildingAge` | Number | |
| `infrastructure.materialType` | enum | `RCC` \| `Brick` \| `Mixed` \| `Temporary` |
| `infrastructure.weatherZone` | enum | `Dry` \| `Heavy Rain` \| `Coastal` \| `Tribal` |
| `location.lat`, `location.lng` | Number | defaults 23.8 / 69.5 (Kutch) — used for GPS validation |
| `isActive` | Boolean | default true |

**Indexes:** `{schoolId}` unique · `{district, block}` compound

### 6.3 `school-condition-record.model.js` → collection `school_condition_records`

The main event-stream of weekly inputs.

| Field | Type | Notes |
|---|---|---|
| `schoolId` | Number | required |
| `schoolRef` | ObjectId | ref → School, indexed |
| `district` | String | required, indexed |
| `block`, `schoolType`, `isGirlsSchool`, `numStudents` | — | |
| `buildingAge` | Number | |
| `materialType` | enum | `RCC` \| `Brick` \| `Mixed` \| `Temporary` |
| `weatherZone` | enum | `Dry` \| `Heavy Rain` \| `Coastal` \| `Tribal` |
| `category` | enum | `plumbing` \| `electrical` \| `structural` |
| `weekNumber` | Number | ISO week |
| `conditionScore` | Number | 1–5 (min/max validated) |
| `issueFlag`, `waterLeak`, `wiringExposed`, `roofLeakFlag` | Boolean | |
| `crackWidthMM`, `toiletFunctionalRatio`, `powerOutageHours` | Number | |
| `photoUploaded` | Boolean | |
| `daysToFailure`, `willFailWithin30Days`, `willFailWithin60Days` | — | engine output (persisted post-submit) |
| `priorityScore` | Number | engine output |
| `repairDone`, `daysSinceRepair`, `contractorDelayDays`, `slaBreach` | — | |
| `createdAt`, `updatedAt` | — | timestamps |

**Unique compound index:** `{schoolId, category, weekNumber}` — enables safe upsert semantics.

### 6.4 `maintenance-decision.model.js` → collection `maintenance_decisions`

| Field | Type | Notes |
|---|---|---|
| `recordId` | ObjectId | ref → SchoolConditionRecord (required) |
| `schoolId` | Number | required |
| `district` | String | required |
| `category`, `weekNumber` | — | required |
| `decision.computedPriorityScore` | Number | required, **indexed descending** |
| `decision.priorityLevel` | enum | `low` \| `medium` \| `high` \| `urgent` |
| `impact.studentsAffected` | Number | default 0 |
| `impact.isGirlsSchool`, `impact.criticalFacility` | Boolean | |
| `explainability.reasons` | [String] | human-readable reasoning array |
| `status` | enum | `pending` \| `approved` \| `assigned` \| `completed` (default: `pending`) |

### 6.5 `work-order.model.js` → collection `work_orders`

| Field | Type | Notes |
|---|---|---|
| `decisionId` | ObjectId | ref → MaintenanceDecision (optional) |
| `schoolId` | Number | required |
| `district`, `category` | String | required |
| `assignment.assignedTo` | ObjectId | ref → User |
| `assignment.assignedBy` | ObjectId | ref → User |
| `priorityScore` | Number | required |
| `status` | enum | `pending` \| `assigned` \| `in_progress` \| `completed` \| `delayed` \| `cancelled` |
| `deadline` | Date | required |
| `startedAt`, `completedAt` | Date | lifecycle |
| `completionProof.photoUrl` | String | |
| `completionProof.gpsLocation.lat/lng` | Number | |
| `locationMismatch` | Boolean | GPS validation flag |

**Index:** `{assignment.assignedTo, status}` — fast contractor dashboards.

### 6.6 `repair-log.model.js` → collection `repair_logs`

Core of the PS-03 **learning feedback loop**.

| Field | Type | Notes |
|---|---|---|
| `workOrderId` | ObjectId | required, indexed |
| `decisionId` | ObjectId | ref → MaintenanceDecision |
| `schoolId` | Number | required, indexed |
| `category` | String | required |
| `before.conditionScore` | Number | required |
| `before.issues` | Mixed | required |
| `after.conditionScore` | Number | required |
| `completionTimeDays` | Number | required |
| `contractorDelayDays` | Number | default 0 |
| `slaBreached` | Boolean | default false |
| `locationMismatch` | Boolean | default false |
| `photoUrl` | String | |
| `predictionSnapshot.riskScore` | Number | pre-repair engine score |
| `predictionSnapshot.riskLevel` | String | |
| `predictionSnapshot.estimatedDaysToFailure` | Number | |
| `predictionSnapshot.within30Days / within60Days` | Boolean | |
| `predictionSnapshot.deteriorationRate` | Number | |
| `predictionSnapshot.evidence` | [String] | |
| `predictionError.beforeConditionScore / afterConditionScore` | Number | |
| `predictionError.conditionDelta` | Number | > 0 = improvement |
| `predictionError.riskScoreDelta` | Number | engine vs actual |
| `predictionError.accuracy` | enum | `overestimated` \| `accurate` \| `underestimated` |

**Index:** `{schoolId, createdAt: -1}`

### 6.7 `alert.model.js` → collection `alerts`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | Number | required, indexed |
| `district`, `category` | String | required |
| `type` | enum | `FAILURE_30_DAYS` \| `FAILURE_60_DAYS` \| `HIGH_PRIORITY` \| `GPS_MISMATCH` |
| `message` | String | required |
| `isResolved` | Boolean | default false, **indexed** |

### 6.8 `district-analytics.model.js` → collection `district_analytics`

| Field | Type | Notes |
|---|---|---|
| `district` | String | required, indexed |
| `totalSchools`, `avgConditionScore`, `highPriorityCount` | Number | |
| `failureWithin30DaysCount`, `failureWithin60DaysCount` | Number | |
| `categoryBreakdown.plumbing` | Number | high-priority count |
| `categoryBreakdown.electrical` | Number | high-priority count |
| `categoryBreakdown.structural` | Number | high-priority count |
| `slaBreachCount` | Number | |
| `generatedAt` | Date | |

### 6.9 `priorityConfig.model.js` → collection `priority_config`

Dynamic, hot-reloadable engine configuration.

| Field | Type | Notes |
|---|---|---|
| `conditionWeights.good` | Number | default 10 |
| `conditionWeights.minor` | Number | default 30 |
| `conditionWeights.major` | Number | default 60 |
| `conditionWeights.critical` | Number | default 90 |
| `multipliers.girlsSchool` | Number | default 1.5 |
| `multipliers.criticalFacility` | Number | default 1.6 |
| `multipliers.studentImpact` | Number | default 1.4 |
| `maxPriorityScore` | Number | default 100 |
| `version` | String | required |
| `isActive` | Boolean | default true |
| `updatedBy` | ObjectId | ref → User |

**Partial unique index:** only **one** document may have `isActive: true` (enforced via `partialFilterExpression`).

### 6.10 `conditionReport.model.js` (legacy) → collection `condition_reports`

Pre-refactor structure kept for backward compatibility:

| Field | Type |
|---|---|
| `schoolId` | ObjectId (ref School) |
| `submittedBy` | ObjectId (ref User) |
| `weekOf` | Date |
| `items[]` | `{category, subCategory, condition, notes}` |
| `overallNotes` | String |
| `riskScore`, `riskLevel` | — |

**Index:** `{schoolId, weekOf: -1}`

---

## 7. Prediction Engine Deep Dive

**File:** `backend/services/predictionEngine.js` (~500 LOC)

### 7.1 Two Engine Modes

#### `predictRiskForCategory()` — PS-03 primary
Fully explainable, per-category risk scoring. Every factor that influences the score produces a named entry in the returned `evidence[]` array — no black-box scoring.

**Scoring pipeline:**
1. **Condition base (0–50)** — avg `conditionScore` over last 3 weeks, linearly mapped
2. **Poor-reading bonus (0–20)** — count of weeks with score ≥ 4
3. **Trend bonus (0–15)** — +15 if latest > oldest (worsening)
4. **Building-age multiplier** — 5 tiers: ×0.80 (<10 y) · ×0.90 (10–19) · ×1.00 (20–29) · ×1.10 (30–39) · ×1.25 (40+)
5. **Weather-zone multiplier** — Dry ×0.90 · Heavy Rain ×1.15 · Coastal ×1.10 · Semi-Arid ×0.95 · Tribal ×1.00
6. **Flag boosts** — waterLeak, wiringExposed, roofLeakFlag, issueFlag, crackWidthMM, toiletFunctionalRatio, powerOutageHours (each produces an evidence item)
7. **Girls' school plumbing multiplier** — ×1.5 for plumbing only (PS-03 mandate)
8. **Student count multiplier** — proportional, capped at ×1.30

**Deterioration analysis (linear regression):**
- `deteriorationSlope(weekHistory)` — slope in score-units / week
- `projectDaysToFailure(slope)` — extrapolates when score crosses failure threshold
- Returns `within_30_days` and `within_60_days` flags

**Dynamic config:** Loads active `PriorityConfig` from DB on first call (module cache). `invalidateConfigCache()` is called after any `PUT /api/admin/priority-config`. Falls back to `DEFAULT_CONFIG` if no active doc.

#### `analyseSchool()` — legacy composite
Multi-category weighted aggregate used by older dashboards. Applies `exp(-0.3 × weekIndex)` time-decay so recent reports dominate.

### 7.2 Other Exports

| Function | Purpose |
|---|---|
| `scoreReportItems(items)` | Legacy 0–100 score from old condition items |
| `predictTimeToFailure(score)` | Legacy composite → days mapping |
| `riskLevel(score)` | `critical` (76+) \| `high` (51–75) \| `moderate` (26–50) \| `low` (0–25) |
| `prioritiseQueue(schoolAnalyses)` | `score × 0.6 + trendBonus + studentImpactBonus` |
| `getActiveConfig()` | DB-cached active PriorityConfig |
| `invalidateConfigCache()` | Flush cache (called on config update) |

### 7.3 Category Weights (composite mode)

| Category | Weight | Rationale |
|---|---|---|
| Structural | 1.00 | Collapse risk |
| Electrical | 0.85 | Fire / shock |
| Sanitation | 0.80 | Health / compliance |
| Plumbing | 0.65 | Water supply |
| Furniture | 0.35 | Low safety impact |

### 7.4 Priority Queue Formula

```
priority = riskScore × 0.6 + trendBonus + studentImpactBonus
```

- `trendBonus` = +15 if deteriorating
- `studentImpactBonus` up to +20 based on enrollment

---

## 8. Frontend Architecture

### 8.1 Routing (`src/App.jsx`)

| Route | Access | Renders |
|---|---|---|
| `/` | Public | `Landing` |
| `/login` | Public | `Login` |
| `/signup` | Public | `Signup` |
| `/dashboard` | Protected | `AppLayout` → `DashboardIndex` (role-aware) |
| `/dashboard/report` | Protected | `WeeklyInputForm` |
| `/dashboard/reports` | Protected | `ConditionLogView` (principal historical audit) |
| `/dashboard/map` | Protected | `GeospatialMap` (leaflet) |
| `/dashboard/work-orders` | Protected | `WorkOrders` |
| `/dashboard/work-orders/new` | Protected | `WorkOrders` (new-order slide-over opens) |
| `*` | — | Redirect to `/login` |

**`DashboardIndex`** role-based landing:
- `peon` → `WeeklyInputForm` (straight to entry form)
- `principal` / `school` → `SchoolView`
- `deo` / `admin` → `DEODashboard`
- `contractor` → `WorkOrders`

### 8.2 Authentication Context (`src/context/AuthContext.jsx`)

`AuthProvider` wraps the whole app and exposes `useAuth()`:

| API | Description |
|---|---|
| `user` | Current user (null if signed out) |
| `loading` | True during initial session restore |
| `login(email, password)` | POST `/api/auth/login` |
| `signup(data)` | POST `/api/auth/register` |
| `logout()` | POST `/api/auth/logout` |
| `updateUser()` | Refresh from `/api/auth/me` |

On mount it calls `GET /api/auth/me` with `credentials: include` to restore the session from the HttpOnly cookie.

### 8.3 API Service (`src/services/api.js`)

Reads `VITE_API_URL` (default `http://localhost:5000`). All helpers send `credentials: "include"`:

| Function | Description |
|---|---|
| `get(path)` | GET |
| `post(path, body)` | POST JSON |
| `put(path, body)` | PUT JSON |
| `patch(path, body)` | PATCH JSON |
| `del(path)` | DELETE |
| `postFile(path, formData)` | multipart (no `Content-Type` header) |

### 8.4 Layout (`components/layout/AppLayout.jsx`)

- Fixed white header (scroll-aware), scroll-progress bar via framer-motion spring
- Brand lockup + "Saksham — Infrastructure Monitoring"
- Desktop role-nav + mobile hamburger slide-down
- User profile dropdown with name, email, sign out
- Role badge (e.g. "DEO COMMAND")
- Footer: "Digital Infrastructure Maintenance Division · Saksham © 2026 · PS-03"

**Role-based nav:**

| Role | Nav items |
|---|---|
| `peon` | Submit Report |
| `principal` | Principal Dashboard · View Reports |
| `deo` | Predictive Queue · Live Map · Command Center |
| `contractor` | My Tasks · All Orders |
| `admin` | Admin Panel · Live Map · All Orders |

### 8.5 Pages

#### `Landing.jsx`
Marketing site built with Tailwind + framer-motion. Uses sections from `components/landing/`:
Navbar · Hero2 · Features2 · GovSchemes (infinite ticker) · AppPreview (3D phone, ConditionMeter gauge) · HowItWorks2 · Testimonials · DownloadSection (QR reveal + live counter) · CTA · Footer.

#### `auth/Login.jsx`
- 5 sandbox role buttons (auto-fill email + `password123`)
- Error banner
- Cookie set server-side; redirect to `/dashboard`

#### `auth/Signup.jsx`
- 5-role selector grid
- `schoolId` field shown only for `peon` / `principal` via `AnimatePresence`
- Posts to `/api/auth/register`

#### `dashboard/WeeklyInputForm.jsx` (peon entry point)
- Guards: only `peon`/`principal` with linked `schoolId`
- Header with district, block, building age, students, weather zone
- 3 category tabs (plumbing / electrical / structural) with icons
- Per-tab inputs: condition 1–5 buttons · category-specific issue flag checkboxes (waterLeak, wiringExposed, roofLeakFlag, issueFlag) · category-specific numeric selects (`toiletFunctionalRatio`, `powerOutageHours`, `crackWidthMM`)
- Summary strip shows all 3 categories' scores at a glance
- Submits all categories sequentially via `POST /api/condition-report`
- Success screen with per-category saved/failed status

#### `dashboard/SchoolView.jsx` (principal)
Fetches in parallel:
1. `GET /api/risk/:schoolId` — live engine
2. `GET /api/condition-report?schoolId=…&limit=20`
3. `GET /api/schools/:schoolId`

Shows: SVG risk gauge (0–100) · prediction summary · per-category bars · condition records list with badges.

#### `dashboard/DEODashboard.jsx`
Primary DEO interface. Calls `GET /api/risk/queue`.
- 4 stat cards: Schools at Risk · Critical · High · Avg Days to Failure
- Filter bar (district / block / category / urgency)
- Priority table: School & Location · At-Risk Categories · Days to Failure · Student Impact · Indicators · Actions
- Coloured failure-window progress bar (red < 15d, orange < 30d, blue otherwise)
- Girls' school badge, evidence-count badge
- **Assign** button → navigates to `/dashboard/work-orders/new?schoolId=…&category=…&score=…`
- Row click → **EvidenceDrawer** (slide-out evidence panel)

#### `dashboard/GeospatialMap.jsx` (deo / admin only)
- React-Leaflet `MapContainer` with CartoDB Positron tiles
- Fetches `/api/schools` + `/api/risk/queue` in parallel and merges `priorityScore` onto each school
- Custom coloured markers: red (≥80) · orange (≥60) · amber (≥40) · emerald (<40) · slate (no data)
- Click marker → popup with school name, district, risk badge
- Also plots the **user's current location** via `navigator.geolocation`
- 3 metric cards at top: Identification Nodes · Critical Designation · Stable Baseline
- Loading spinner overlay during fetch

#### `dashboard/ConditionLogView.jsx` (principal)
- Guards: only `principal` / `school` with linked `schoolId`
- 4 metric cards (Audit Volume · Critical Path · Elevated Risk · Visual Evidence)
- Filters: category (All / plumbing / electrical / structural) and risk level (critical / high / moderate / low)
- Sorted list of expandable `ReportCard`s; expanded view shows Priority Index, MTTF (days), 30D / 60D risk, and category-specific numeric detail bars

#### `dashboard/WorkOrders.jsx`
- Role-aware: contractors see only assigned; DEO/admin see all
- Status filter tabs with counts (all / pending / assigned / in_progress / completed)
- SLA metric card when any breached exist
- Order cards: category icon, priority badge, SLA badge (animated), school / contractor / deadline / delay grid
- DEO: **Assign Now** (PATCH → assigned), **New Assignment** slide-over panel (school selector, category, priority, description, contractor, due date)
- Contractor: **Close Order** → opens `CompletionModal`
- Auto-opens new-assignment panel when redirected with prefill params

### 8.6 Reusable Common Components (`components/common/`)

| File | Description |
|---|---|
| `Badge.jsx` | Variant-driven pill (`critical` / `high` / `moderate` / `low` / `info` / etc) |
| `Button.jsx` | Multi-variant (`primary` / `ghost` / `outline` / `danger`), `isLoading`, sizes |
| `Card.jsx` | Styled container with configurable padding / shadow / hover |
| `Input.jsx` | Text/number input with label + error + icon |
| `Select.jsx` | Styled select with chevron |
| `MetricCard.jsx` | Big-number KPI tile with variant (`info`/`critical`/`high`/`success`), icon, trend value |
| `PageHeader.jsx` | Title + subtitle + icon + optional `actions` slot |
| `ProtectedRoute.jsx` | Redirects unauthenticated users to `/login`, shows spinner during load |
| `CompletionModal.jsx` | Contractor completion form: pre/post score selectors, GPS auto-capture, photo placeholder, notes, posts `/api/tasks/complete` |
| `EvidenceDrawer.jsx` | Right-side slide-out — school name, at-risk category chips, supporting evidence bullets, methodology note |

---

## 9. API Endpoints Reference

### Server-level
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Server status + cheat sheet |
| GET | `/api/seed-demo` | — | Seed demo data |
| GET | `/uploads/:filename` | — | Static file serving |

### Authentication `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create user, issue JWT cookie |
| POST | `/login` | Validate, set cookie |
| POST | `/logout` | Clear cookie |
| GET | `/me` | Get current user (JWT) |

### Profile `/api/me` — all JWT
| Method | Path | Description |
|---|---|---|
| GET | `/` | Own profile |
| PUT | `/` | Update name / phone / district |
| PUT | `/password` | Change password |

### Schools `/api/schools` — JWT
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all schools |
| GET | `/:id` | School by numeric ID |

### Reports `/api/reports` (alias `/api/condition-report`) — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/` | peon, principal, deo, admin | Submit weekly report + run engine |
| GET | `/` | All | List with filters |
| GET | `/:school_id` | All | Records for one school |

### Risk `/api/risk` (alias `/api/risk-scores`) — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/all` | deo, admin, contractor | All predictions (stored values) |
| GET | `/queue` | deo, admin | District-level aggregated queue |
| GET | `/` | deo, admin | Legacy aggregation |
| GET | `/:school_id` | All | Live engine per category |

### Maintenance Queue
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/maintenance-queue` | deo, bmo, admin, contractor | Alias to `getMaintenanceQueue` |

### Tasks `/api/tasks` (alias `/api/work-orders`) — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` | All | List (contractor-scoped) |
| POST | `/assign` | deo, admin | Create & assign |
| POST | `/complete` | contractor, deo, admin | Complete with GPS + photo |
| PATCH | `/:id/status` | deo, admin | Update status |

### Alerts `/api/alerts` — JWT
| Method | Path | Description |
|---|---|---|
| GET | `/` | List unresolved |
| GET | `/digest` | Aggregate by district+category |
| PATCH | `/:id/read` | Mark resolved |

### Analytics `/api/analytics` — JWT
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` | All | District analytics |
| POST | `/update` | All | Recompute analytics |
| GET | `/model-accuracy` | deo, admin | Engine accuracy per category+district |

### Maintenance `/api/maintenance` — JWT
| Method | Path | Description |
|---|---|---|
| POST | `/decisions` | Create decision |
| POST | `/work-orders` | Create work order (raw) |
| POST | `/repair-logs` | Create repair log + prediction feedback |

### School Conditions `/api/school-conditions` — JWT
| Method | Path | Description |
|---|---|---|
| GET | `/` | List records |
| POST | `/` | Create record |

### Admin `/api/admin` — JWT + authorize
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/stats` | admin | System-wide counts |
| GET | `/users` | admin | All users |
| DELETE | `/users/:id` | admin | Delete user |
| GET | `/load-csv` | admin | Trigger CSV pipeline |
| GET | `/priority-config` | deo, admin | Get active config |
| PUT | `/priority-config` | admin | Update config + flush cache |

---

## 10. CSV Pipeline & Scripts

### 10.1 `scripts/loadCSV.js` — primary data ingestion

Streams `TS-PS3.csv` (~50 000 rows) using Node's `readline` (memory-efficient):

1. Parse each row → validate `school_id`, `week_number`, `category`, `condition_score`
2. Map to `SchoolConditionRecord` document (all fields)
3. Batch insert with `ordered: false` (skips duplicates, continues on error)
4. Generate `MaintenanceDecision` for rows with `issueFlag = true` (+ girls'-school plumbing +15 boost)
5. Generate `Alert` rows for `willFailWithin30Days` / `willFailWithin60Days` / `priorityScore ≥ 80`
6. Compute and upsert `DistrictAnalytics` per district

**Unique key:** `{schoolId, category, weekNumber}` — pipeline is idempotent.

### 10.2 Other Scripts

| Script | Purpose |
|---|---|
| `clearDB.js` | Drop all documents from all collections |
| `listCollections.js` | List collections with counts + samples |
| `verify_gps.js` | Sanity-check GPS coordinates on schools |

### 10.3 NPM Scripts

| Directory | Command | Purpose |
|---|---|---|
| frontend | `npm run dev` | Vite dev server at `:5173` |
| frontend | `npm run build` | Production bundle → `dist/` |
| frontend | `npm run preview` | Preview prod build |
| backend | `npm run dev` | nodemon on `server.js` |
| backend | `npm run start` | `node server.js` |
| backend | `npm run load-csv` | Run `scripts/loadCSV.js` |

### 10.4 Demo Accounts (from `seed.controller.js`)

Password `password123` for all:

| Role | Email |
|---|---|
| DEO | `deo@demo.com` |
| Contractor | `contractor1@demo.com` |
| School | `school1@demo.com` |
| Admin | `admin@demo.com` |

---

## 11. Environment & Deployment

### Backend `.env`
| Variable | Default | Description |
|---|---|---|
| `PORT` | 5000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `MONGODB_URI` | `mongodb://localhost:27017/predictive_maintenance` | Mongo connection |
| `JWT_SECRET` | *(required)* | JWT signing secret |
| `JWT_EXPIRE` | 7d | Token TTL |
| `FRONTEND_URL` | `http://localhost:5173` | CORS origin |

### Frontend `.env`
| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Backend base URL |

### Deployment

- **Frontend** (Vercel) — `vercel.json` sets SPA rewrites (all routes → `index.html`), separate rules for `/avatars/*` and `/assets/*`, build output `dist`
- **Backend** — any Node host (Render, Railway, etc.); requires MongoDB Atlas URI

---

## 12. Known Gaps & Technical Debt

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Backend | `seed.js` uses old model filenames (`./models/School.js`) that no longer exist | Legacy; API seeder (`seed.controller.js`) is used instead |
| 2 | Backend | Dual work-order routes (`/api/tasks` + `/api/work-orders` both delegate to same controller) | Keep alias until all clients migrated |
| 3 | Frontend | `CompletionModal` GPS timeout is 5 s — may be too short on mobile; no retry UI | Open |
| 4 | Frontend | No DEO "GPS Mismatch" tab (alerts only surface via `/api/alerts`) | Open |
| 5 | Frontend | SLA breach analytics (avg delay per contractor) not surfaced anywhere | Open |
| 6 | Frontend | `WorkOrders` contractor list fetched from `/api/admin/users` — DEO may hit 403 | Open |
| 7 | Backend | No `express-validator` on report / complete endpoints (manual checks only) | Open |
| 8 | Engine | Feedback loop logs `predictionError` but does not auto-retune `PriorityConfig` weights | Roadmap |
| 9 | Docs | `README.md` references legacy role (`school`) and legacy model filenames | Minor |
| 10 | Backend | `scripts/verify_gps.js` import path is broken (`./backend/models/...` instead of `../models/...`) | Open |

---

*Document generated April 18, 2026 · Saksham (Tarkshaastra) · Predictive Maintenance Engine for School Infrastructure (PS-03)*
