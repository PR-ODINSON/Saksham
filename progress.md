# Tarkshaastra — Project Progress Document

> **Project Name:** Saksham (Platform) / Tarkshaastra (Repo)
> **Problem Statement:** TS-03 — Predictive Maintenance Engine for School Infrastructure
> **Stack:** React 18 + Vite (Frontend) · Express + Mongoose (Backend) · MongoDB (Database)
> **Last Updated:** April 18, 2026

---

## Table of Contents

1. [Problem Statement Analysis — TS-03](#1-problem-statement-analysis--ts-03)
2. [PS-Required Features vs Implementation Status](#2-ps-required-features-vs-implementation-status)
3. [Repository Structure](#3-repository-structure)
4. [Technology Stack](#4-technology-stack)
5. [Backend — Features & Implementation](#5-backend--features--implementation)
   - 5.1 [Server Setup & Middleware](#51-server-setup--middleware)
   - 5.2 [Authentication & Authorization](#52-authentication--authorization)
   - 5.3 [User Profiles](#53-user-profiles)
   - 5.4 [School Management](#54-school-management)
   - 5.5 [Condition Reports (Weekly Input)](#55-condition-reports-weekly-input)
   - 5.6 [Risk Prediction Engine](#56-risk-prediction-engine)
   - 5.7 [Risk Score API](#57-risk-score-api)
   - 5.8 [Maintenance Queue](#58-maintenance-queue)
   - 5.9 [Tasks / Work Orders (PS-03 Flow)](#59-tasks--work-orders-ps-03-flow)
   - 5.10 [Legacy Work Orders API](#510-legacy-work-orders-api)
   - 5.11 [Alerts System](#511-alerts-system)
   - 5.12 [District Analytics](#512-district-analytics)
   - 5.13 [Maintenance Decisions, Work Orders & Repair Logs](#513-maintenance-decisions-work-orders--repair-logs)
   - 5.14 [School Conditions](#514-school-conditions)
   - 5.15 [Admin Panel & Priority Config](#515-admin-panel--priority-config)
   - 5.16 [CSV Bulk Import Pipeline](#516-csv-bulk-import-pipeline)
   - 5.17 [File Upload System](#517-file-upload-system)
   - 5.18 [GPS Validation & Location Mismatch](#518-gps-validation--location-mismatch)
   - 5.19 [Model Accuracy & Prediction Feedback Loop](#519-model-accuracy--prediction-feedback-loop)
6. [Database Models & Schemas](#6-database-models--schemas)
7. [Frontend — Features & Implementation](#7-frontend--features--implementation)
   - 7.1 [Application Routing & Layout](#71-application-routing--layout)
   - 7.2 [Authentication Context & Flow](#72-authentication-context--flow)
   - 7.3 [API Service Layer](#73-api-service-layer)
   - 7.4 [Landing Page](#74-landing-page)
   - 7.5 [Login & Signup Pages](#75-login--signup-pages)
   - 7.6 [Protected Dashboard Shell](#76-protected-dashboard-shell)
   - 7.7 [School View (Peon/Principal Role)](#77-school-view-peonprincipal-role)
   - 7.8 [DEO Dashboard](#78-deo-dashboard)
   - 7.9 [Weekly Condition Report Form](#79-weekly-condition-report-form)
   - 7.10 [Work Orders Page (Contractor Role)](#710-work-orders-page-contractor-role)
   - 7.11 [Completion Modal (GPS + Photo Proof)](#711-completion-modal-gps--photo-proof)
   - 7.12 [Evidence Drawer](#712-evidence-drawer)
   - 7.13 [Reusable UI Components](#713-reusable-ui-components)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Configuration & Tooling](#9-configuration--tooling)
10. [Scripts & Utilities](#10-scripts--utilities)
11. [Environment Variables](#11-environment-variables)
12. [Deployment Configuration](#12-deployment-configuration)
13. [Known Issues & Gaps](#13-known-issues--gaps)

---

## 1. Problem Statement Analysis — TS-03

**Title:** Predictive Maintenance Engine — School Infrastructure

**Domain:** Public Institution · AI/ML

**Core Problem:**
Gujarat has over 30,000 government school buildings, a large proportion of which have classrooms, toilets, or electrical fittings in disrepair. Repairs happen **reactively** — after failure is visible. The PS demands a **predictive** maintenance system where school staff submit weekly structured condition inputs via a simple mobile form. The system aggregates inputs, learns deterioration patterns by building age, material, and weather zone, and generates a prioritised maintenance schedule for the DEO — flagging schools **30–60 days** from critical failure across plumbing, electrical, and structural categories.

### User Roles (from PS)

| Role | Key Use Case |
|---|---|
| **School Peon/Watchman** | Opens weekly dropdown form; selects category and condition; uploads optional photo (< 2 min) |
| **School Principal** | Views school condition summary; approves urgent repair requests |
| **DEO** | Views prioritised district maintenance queue; assigns contractors; tracks SLA |
| **Contractor** | Receives work order; submits photo + GPS completion confirmation |

### PS Winning Logic (Differentiators)

1. **Failure prediction is category-specific** — plumbing, electrical, and structural tracked independently
2. **Prioritisation accounts for student impact** — broken toilet in girls' school ranks above cracked storage wall
3. **Prediction cites specific inputs that triggered it** — not a black-box score (cited evidence)
4. **DEO receives a district-level maintenance queue** — not school-by-school alert flood
5. **System learns from completed repairs** — repair records update the deterioration model

### 8 Functionalities Required by PS

| # | Requirement | Implementation Status |
|---|---|---|
| 1 | Structured weekly condition form: dropdown + photo, no free text, completable in < 2 minutes | ✅ Done — `WeeklyInputForm.jsx` |
| 2 | Category-specific failure prediction: plumbing, electrical, structural tracked independently | ✅ Done — `predictionEngine.js` |
| 3 | Failure prediction with cited evidence — not a black-box score | ✅ Done — `evidence[]` array in engine |
| 4 | Student impact prioritisation (girls' school toilet > cracked wall in storage room) | ✅ Done — `girlsMult` + `studentMult` in engine |
| 5 | Predictive horizon: 30–60 day failure window per category per school | ✅ Done — `within_30_days`, `within_60_days` flags |
| 6 | DEO district-level maintenance queue — not individual school alert flood | ✅ Done — `/api/risk/queue` aggregated by school |
| 7 | Contractor work order and completion confirmation workflow | ✅ Done — `/api/tasks/assign`, `/api/tasks/complete` |
| 8 | Model learns from completed repairs — repair records update deterioration model | ✅ Done — `RepairLog` + `predictionError` feedback loop |

---

## 2. PS-Required Features vs Implementation Status

### Fully Implemented ✅

- **Weekly structured form** (dropdown-based, 3 categories, < 2 min UX target)
- **Category-specific prediction engine** (plumbing, electrical, structural tracked independently with independent risk scores)
- **Cited evidence output** (every engine call returns `evidence[]` array citing specific inputs that drove the score)
- **Girls' school plumbing boost** (×1.5 multiplier on plumbing risk if `isGirlsSchool = true`)
- **Student count multiplier** (proportional to enrollment, capped at ×1.30)
- **Building age multiplier** (6-tier table from ×0.80 for new buildings to ×1.25 for 40+ year buildings)
- **Weather zone multiplier** (Dry ×0.90, Heavy Rain ×1.15, Coastal ×1.10, etc.)
- **30/60-day failure windows** (computed from deterioration slope via linear regression on week history)
- **Deterioration rate** (slope in score-units/week from linear regression)
- **District-level maintenance queue** (`/api/risk/queue` aggregates per school, not per condition record)
- **Contractor work orders** (assign + complete flow with GPS + photo proof)
- **GPS validation** (Haversine distance check against school's stored coordinates; flags mismatch > 5km)
- **Location mismatch recording** (`locationMismatch` field on `WorkOrder` and `RepairLog`)
- **Repair feedback loop** (`RepairLog` stores `predictionSnapshot` and `predictionError` with accuracy label: overestimated/accurate/underestimated)
- **Model accuracy analytics** (`/api/analytics/model-accuracy` aggregates prediction errors by category and district)
- **SLA tracking** (`slaBreached` flag, `contractorDelayDays`, SLA breach analytics)
- **Dynamic priority config** (`PriorityConfig` model; admin can tune weights via API; engine cache invalidation)
- **CSV bulk import** (50,000+ row `TS-PS3.csv` pipeline generating all four collections)
- **Alert system** (auto-generated alerts for 30-day and 60-day failure predictions and high priority scores)
- **District analytics** (aggregated per district with category breakdown, SLA breach count)
- **Role-based access** (5 roles: peon, principal, deo, contractor, admin with JWT middleware)

### Partially Implemented / Missing ⚠️

- **Principal dashboard** — principal role exists and can log in, but renders the same `SchoolView` as peon (no dedicated principal dashboard with trend analysis or contractor communication)
- **Real-time GPS mismatch alerts** — backend records `locationMismatch` but frontend has no "Flagged" tab or push notification UI for DEOs
- **SLA breach analytics in UI** — backend computes SLA data but DEO dashboard does not surface average delay days per contractor
- **Prediction failure dates in DEO UI** — `within_30_days`/`within_60_days` exist in queue data but are not prominently displayed in DEO dashboard table
- **`backend/seed.js` broken** — uses old model import paths (`./models/School.js`, `ConditionReport.js`) that don't match current filenames
- **`backend/scripts/verify_gps.js` broken** — uses wrong import path `./backend/models/index.js` instead of `../models/index.js`
- **Dual API paths** — `/api/tasks` and `/api/work-orders` both exist as canonical routes (technical debt)
- **`/api/school-conditions` unprotected** — no `protect` middleware on schoolCondition routes GET handler
- **Input validation** — no `express-validator` on report submission or task completion endpoints

---

## 3. Repository Structure

```
D:\Tarkshaastra\
├── README.md                     # Project overview & setup guide
├── .gitignore
├── TS-PS3.csv                    # Historical data CSV (50,000 rows) for bulk import
├── package-lock.json             # Root lockfile
│
├── frontend/                     # Vite + React 18 SPA
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vercel.json               # SPA rewrite rules for Vercel
│   ├── package.json
│   └── src/
│       ├── index.js              # React root mount
│       ├── App.jsx               # Router + route definitions
│       ├── index.css / App.css   # Global styles (Tailwind)
│       ├── pages/                # Top-level page components
│       │   ├── Landing.jsx
│       │   ├── Login.jsx
│       │   ├── Signup.jsx
│       │   ├── SchoolView.jsx
│       │   ├── DEODashboard.jsx
│       │   ├── WeeklyInputForm.jsx
│       │   └── WorkOrders.jsx
│       ├── components/
│       │   ├── AppLayout.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── CompletionModal.jsx   # GPS + photo proof for contractor
│       │   ├── EvidenceDrawer.jsx    # Slide-out prediction evidence panel
│       │   ├── landing/              # 10 landing page section components
│       │   └── ui/                   # Reusable UI primitives
│       ├── context/AuthContext.jsx
│       └── services/api.js
│
└── backend/                      # Express + Mongoose API server
    ├── server.js                 # App entry, route mounting, CORS
    ├── seed.js                   # Demo seed script (BROKEN — see issues)
    ├── package.json
    ├── .env / .env.example
    ├── config/
    │   ├── database.js           # Mongoose connection
    │   └── multer.js             # File upload config
    ├── controllers/
    │   ├── admin.controller.js
    │   ├── alert.controller.js
    │   ├── analytics.controller.js
    │   ├── auth.controller.js
    │   ├── maintenance.controller.js
    │   ├── profile.controller.js
    │   ├── report.controller.js
    │   ├── risk.controller.js
    │   ├── school.controller.js
    │   ├── schoolCondition.controller.js
    │   ├── seed.controller.js        # API-based demo seeder
    │   └── workorder.controller.js
    ├── middlewares/
    │   └── auth.middleware.js        # JWT protect + authorize
    ├── middleware/
    │   └── rateLimiter.js
    ├── models/
    │   ├── index.js                  # Central export of all models
    │   ├── user.model.js
    │   ├── school.model.js
    │   ├── school-condition-record.model.js
    │   ├── maintenance-decision.model.js
    │   ├── work-order.model.js
    │   ├── repair-log.model.js
    │   ├── alert.model.js
    │   ├── district-analytics.model.js
    │   ├── priorityConfig.model.js
    │   └── conditionReport.model.js  # Legacy model (pre-refactor)
    ├── routes/
    │   ├── admin.routes.js
    │   ├── alert.routes.js
    │   ├── analytics.routes.js
    │   ├── auth.routes.js
    │   ├── maintenance.routes.js
    │   ├── profile.routes.js
    │   ├── report.routes.js
    │   ├── risk.routes.js
    │   ├── school.routes.js
    │   ├── schoolCondition.routes.js
    │   ├── task.routes.js            # Primary PS-03 work order routes
    │   └── workorder.routes.js       # Legacy alias
    ├── services/
    │   └── predictionEngine.js       # Core rule-based AI engine
    ├── Methods/
    │   └── bcryptPassword.js
    ├── scripts/
    │   ├── loadCSV.js
    │   ├── clearDB.js
    │   ├── listCollections.js
    │   └── verify_gps.js             # BROKEN — wrong import path
    └── uploads/                      # Static file serving
```

---

## 4. Technology Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| react-router-dom | 6 | Client-side routing |
| Vite | 5 | Build tool & dev server |
| Tailwind CSS | 3 | Utility-first CSS framework |
| PostCSS + Autoprefixer | — | CSS pipeline |
| framer-motion | 12 | Animations & transitions |
| lucide-react | 1.8 | Icon library |

### Backend
| Package | Purpose |
|---|---|
| Express 4 | HTTP server framework |
| Mongoose 7 | MongoDB ODM |
| dotenv | Environment variable loading |
| cors | Cross-Origin Resource Sharing |
| cookie-parser | HTTP cookie handling |
| jsonwebtoken 9 | JWT generation & verification |
| bcryptjs 3 | Password hashing |
| multer | Multipart file upload handling |
| uuid | Unique ID generation |
| express-rate-limit | API rate limiting |
| nodemon (dev) | Auto-restart on file changes |

### Database
- **MongoDB** (via `MONGODB_URI` env var) — document store for all 8 active collections

---

## 5. Backend — Features & Implementation

### 5.1 Server Setup & Middleware

**File:** `backend/server.js`

- Express app with **CORS** configured for `localhost:5173`, `localhost:5174`, and `FRONTEND_URL` env var
- **`cookie-parser`** for reading HttpOnly cookies
- **`express.json()`** + **`express.urlencoded()`** body parsing
- **Rate limiter** on all `/api` routes — 200 requests per 15-minute window per IP
- Static file serving for `/uploads` directory
- `GET /health` endpoint returns server status + full API endpoint cheat sheet
- `GET /api/seed-demo` calls `seedDatabase()` controller (no auth, seeds demo data)
- All 11 route modules mounted

### 5.2 Authentication & Authorization

**Files:** `backend/controllers/auth.controller.js`, `backend/middlewares/auth.middleware.js`, `backend/routes/auth.routes.js`

**Implemented:**
- **Registration** (`POST /api/auth/register`) — hashes password (bcrypt, 10 rounds), creates user with role, issues JWT cookie
- **Login** (`POST /api/auth/login`) — validates credentials, sets HttpOnly `token` cookie, returns user object
- **Logout** (`POST /api/auth/logout`) — clears cookie with expired date
- **Get current user** (`GET /api/auth/me`) — decodes JWT from cookie or `Authorization: Bearer` header

**JWT Strategy:**
- 7-day expiry by default (`JWT_EXPIRE` env)
- Stored in HttpOnly cookie (`sameSite: 'lax'`, `secure` in production)
- `protect` middleware validates token and attaches `req.user = { id, role }`
- `authorize(...roles)` middleware restricts to specific role list

**Roles enum:** `peon` | `principal` | `deo` | `contractor` | `admin`

**Password Utility:** `backend/Methods/bcryptPassword.js` — `hashPassword()` and `comparePassword()` exports

### 5.3 User Profiles

**Files:** `backend/controllers/profile.controller.js`, `backend/routes/profile.routes.js`

Mounted at `/api/me` (all routes require `protect`):
- `GET /api/me/` — get own profile with `schoolId` populated (name, district)
- `PUT /api/me/` — update name, phone, district
- `PUT /api/me/password` — change password (verifies current before updating)

### 5.4 School Management

**Files:** `backend/controllers/school.controller.js`, `backend/routes/school.routes.js`

No standalone School collection — school info is derived from `SchoolConditionRecord` via aggregation:

- `GET /api/schools/` — aggregates distinct school profiles from condition records (latest-first), sorted by `maxPriorityScore`
- `GET /api/schools/:id` — single school profile (numeric `school_id`) from condition records

Additionally, a `School` model (`school.model.js`) stores GPS coordinates (`location.lat`, `location.lng`) used by the GPS validation workflow.

### 5.5 Condition Reports (Weekly Input)

**Files:** `backend/controllers/report.controller.js`, `backend/routes/report.routes.js`

Mounted at `/api/reports` and `/api/condition-report` (same router, two aliases):

- `POST /` — submit a weekly condition report
  - Roles: `peon`, `principal`, `deo`, `admin`
  - Accepts multipart with up to 5 image uploads
  - Validates category enum (`plumbing`, `electrical`, `structural`)
  - Validates conditionScore (1–5)
  - Uses **upsert** (`findOneAndUpdate`) on `{schoolId, category, weekNumber}` unique key — re-submitting overwrites
  - `photoUploaded` flag set if `req.file` or body flag present
- `GET /` — list reports with optional filters: `schoolId`, `district`, `category`, `weekNumber`, `limit`
- `GET /:school_id` — all records for one school, sorted by weekNumber desc

### 5.6 Risk Prediction Engine

**File:** `backend/services/predictionEngine.js`

The core of the PS-03 implementation. Two prediction modes:

#### `predictRiskForCategory()` — Primary PS-03 engine

Fully explainable per-category risk scoring. Every input flag generates a named evidence item.

**Scoring Pipeline:**
1. **Condition base (0–50):** Average `conditionScore` over last 3 weeks, mapped to 0–50 range
2. **Poor-reading bonus (0–20):** Count of weeks with score ≥ 4 out of last 3, scaled to 0–20
3. **Trend bonus (0–15):** +15 if latest score > oldest score in history (worsening trend)
4. **Building-age multiplier:** 6 tiers from ×0.80 (<10y) to ×1.25 (40+y)
5. **Weather-zone multiplier:** Dry ×0.90, Heavy Rain ×1.15, Coastal ×1.10, Tribal ×1.00
6. **Issue flags:** Named evidence items for waterLeak, wiringExposed, roofLeakFlag, issueFlag, crackWidthMM, toiletFunctionalRatio, powerOutageHours
7. **Girls' school multiplier:** ×1.5 applied to plumbing only (PS-03 spec requirement)
8. **Student count multiplier:** Proportional, capped at ×1.30

**Deterioration Analysis:**
- **Linear regression slope** on `weekHistory` (`deteriorationSlope()`)
- **Projected days to failure** from slope extrapolation (`projectDaysToFailure()`)
- Returns `within_30_days` and `within_60_days` boolean flags

**Evidence array:** Every factor that affected the score is listed in plain English in the `evidence[]` array — no black-box scores.

**Dynamic config:** Loads `PriorityConfig` from DB on first call (cached in-memory); `invalidateConfigCache()` export for admin updates. Falls back to `DEFAULT_CONFIG` if no active config exists.

#### `analyseSchool()` — Legacy composite multi-category engine

Used by old dashboard endpoints. Computes a weighted composite across categories with time-decay weighting (recent reports weighted higher via `exp(-0.3 * weekIndex)`).

#### Other exports:
- `scoreReportItems(items)` — maps old-style condition items to 0–100 score
- `predictTimeToFailure(score)` — legacy days-to-failure from composite score
- `riskLevel(score)` — maps score to `critical`/`high`/`moderate`/`low`
- `prioritiseQueue(schoolAnalyses)` — priority queue formula: `score × 0.6 + trendBonus + studentBonus`

### 5.7 Risk Score API

**Files:** `backend/controllers/risk.controller.js`, `backend/routes/risk.routes.js`

Mounted at `/api/risk` and `/api/risk-scores`:

- `GET /all` — latest predictions across all schools/categories using **stored values** from CSV (fast, no live engine call). Annotates with quick evidence from stored flags.
- `GET /queue` — district-level maintenance queue via MongoDB aggregation pipeline on `MaintenanceDecision`. Groups by `schoolId`, returns top evidence, min days to failure, max priority score. **This is the primary DEO endpoint.**
- `GET /` — legacy risk-scores aggregation from `SchoolConditionRecord`
- `GET /:school_id` — **live engine calls** per category for one school. Fetches all historical records, groups by category, runs `predictRiskForCategory()` with full week history. Returns `evidence[]`, `estimated_days_to_failure`, `deterioration_rate`, etc.

**Static routes (`/all`, `/queue`) are registered before `/:school_id`** to prevent route shadowing.

### 5.8 Maintenance Queue

The `/api/risk/queue` endpoint is the primary PS-03 DEO interface. It runs a multi-stage MongoDB aggregation pipeline on `MaintenanceDecision`:
- Joins with `School` (name, block)
- Joins with `SchoolConditionRecord` (daysToFailure)
- Groups by `schoolId` — aggregates categories, max priority score, min days to failure
- Flattens evidence into `topEvidence[]` array (up to 5 items)
- Filters by `urgency` days (default 60)
- Supports `district`, `block`, `category` query filters

### 5.9 Tasks / Work Orders (PS-03 Flow)

**Files:** `backend/controllers/workorder.controller.js`, `backend/routes/task.routes.js`

Mounted at `/api/tasks`:

- `GET /` — list work orders (contractor sees only assigned; DEO/admin see all). Populates `assignedTo` name/phone and `assignedBy` name.
- `POST /assign` — create and assign a work order. If `decisionId` not provided, auto-resolves to latest pending `MaintenanceDecision` for that school+category. Updates decision status to 'assigned'.
- `POST /complete` — PS-03 completion workflow:
  1. GPS validation via Haversine formula against `School.location` (flags mismatch if > 5km)
  2. Records `completionProof` (photoUrl, gpsLocation)
  3. Creates `RepairLog` with before/after condition scores, `slaBreached`, `locationMismatch`
  4. Updates `MaintenanceDecision` status to 'completed'
  5. Returns both `workOrder` and `repairLog`
- `PATCH /:id/status` — update status (roles: deo, admin)

### 5.10 Legacy Work Orders API

**Files:** `backend/routes/workorder.routes.js`

Mounted at `/api/work-orders` (alias to same workorder.controller.js handlers). Used by current `WorkOrders.jsx` frontend. Considered technical debt — should be consolidated into `/api/tasks`.

### 5.11 Alerts System

**Files:** `backend/controllers/alert.controller.js`, `backend/routes/alert.routes.js`

- `GET /api/alerts/` — list unresolved alerts, filterable by `district` and `type`
- `GET /api/alerts/digest` — aggregated digest: groups by district+category, returns count and message string
- `PATCH /api/alerts/:id/read` — marks alert as resolved (`isResolved: true`)

Alerts are auto-generated during CSV load by `loadCSV.js` for:
- `FAILURE_30_DAYS` — `willFailWithin30Days = true`
- `FAILURE_60_DAYS` — `willFailWithin60Days = true`
- `HIGH_PRIORITY` — `priorityScore >= 80`

### 5.12 District Analytics

**Files:** `backend/controllers/analytics.controller.js`, `backend/routes/analytics.routes.js`

- `GET /api/analytics/` — list district analytics, filterable by `district`
- `POST /api/analytics/update` — create/update district analytics record
- `GET /api/analytics/model-accuracy` — **PS-03 learning requirement**: aggregates `predictionError` deltas from `RepairLog` by category and district. Returns `meanAbsoluteError`, `meanConditionDelta`, accuracy breakdown (overestimated/accurate/underestimated), and total repair count.

### 5.13 Maintenance Decisions, Work Orders & Repair Logs

**Files:** `backend/controllers/maintenance.controller.js`, `backend/routes/maintenance.routes.js`

Mounted at `/api/maintenance`:
- `POST /decisions` — create a `MaintenanceDecision` linked to a `SchoolConditionRecord`
- `POST /work-orders` — create a `WorkOrder` (raw, for programmatic use)
- `POST /repair-logs` — create a `RepairLog` with full prediction feedback computation:
  - Fetches historical condition records
  - Runs `predictRiskForCategory()` to get pre-repair snapshot
  - Computes `predictionError` (conditionDelta, riskScoreDelta, accuracy label)
  - Stores `predictionSnapshot` and `predictionError` on the log

### 5.14 School Conditions

**Files:** `backend/controllers/schoolCondition.controller.js`, `backend/routes/schoolCondition.routes.js`

- `POST /api/school-conditions/` — create a raw `SchoolConditionRecord` (requires `protect` + authorized roles)
- `GET /api/school-conditions/` — list all records (requires `protect`)

Both routes now have `protect` middleware (GET had been unprotected — see issues).

### 5.15 Admin Panel & Priority Config

**Files:** `backend/controllers/admin.controller.js`, `backend/routes/admin.routes.js`

All routes: `protect` + `authorize('admin', 'deo')` at router level:

- `GET /api/admin/stats` — counts across all 8 collections including `slaBreaches` and `failuresWithin30Days`
- `GET /api/admin/users` — all users (admin only)
- `DELETE /api/admin/users/:id` — delete user (admin only)
- `GET /api/admin/load-csv` — spawns `loadCSV.js` as child process; responds 202 immediately
- `GET /api/admin/priority-config` — get active `PriorityConfig` (DEO + admin)
- `PUT /api/admin/priority-config` — create new active config, deactivate old, flush engine cache (admin only)

**`PriorityConfig` model** — stores tunable weights (`conditionWeights`, `multipliers`, `maxPriorityScore`, `version`). Enforced single active via partial unique index on `{ isActive: true }`.

### 5.16 CSV Bulk Import Pipeline

**File:** `backend/scripts/loadCSV.js`

Streams `TS-PS3.csv` (~50,000 rows) using `readline` (memory-efficient):

**Pipeline steps:**
1. Parse CSV → validate `school_id`, `week_number`, `category`, `condition_score`
2. Map each row to `SchoolConditionRecord` document with full field mapping
3. Batch insert with `ordered: false` (skips duplicates, continues on error)
4. Generate `MaintenanceDecision` for all records where `issueFlag = true` (+ girls' school plumbing +15 boost)
5. Generate `Alert` for records with `willFailWithin30Days`, `willFailWithin60Days`, or `priorityScore >= 80`
6. Compute `DistrictAnalytics` via MongoDB aggregation and upsert per district

**Unique constraint:** `SchoolConditionRecord` has compound unique index on `{schoolId, category, weekNumber}` — re-running pipeline skips existing rows.

### 5.17 File Upload System

**File:** `backend/config/multer.js`

- **Storage:** disk storage under `backend/uploads/` (auto-created)
- **Accepted types:** MIME check for jpeg/jpg/png/gif/bmp/webp
- **Size limit:** 10 MB per file
- Files served statically at `/uploads/<filename>`
- Used by: condition report POST (up to 5 images), task completion POST (1 completion image)

### 5.18 GPS Validation & Location Mismatch

**File:** `backend/controllers/workorder.controller.js` — `completeTask()` handler

When contractor submits `lat`/`lng` with completion:
1. Looks up `School.location` for the work order's `schoolId`
2. Computes Haversine distance between submitted coordinates and school coordinates
3. If distance > 5km → sets `locationMismatch = true`
4. Records `gpsLocation` on `WorkOrder.completionProof`
5. Propagates `locationMismatch` to `RepairLog`

**Missing:** Frontend DEO alert UI for GPS mismatches (backend only).

### 5.19 Model Accuracy & Prediction Feedback Loop

**PS-03 requirement #8:** "System learns from completed repairs — repair records update the deterioration model."

Implementation in `maintenance.controller.js` (`createRepairLog`) and `workorder.controller.js` (`completeTask`):

1. On repair completion, fetches all historical `SchoolConditionRecord` for that school+category
2. Runs `predictRiskForCategory()` to capture what the engine predicted before repair
3. Stores `predictionSnapshot` (pre-repair engine output)
4. Computes `predictionError`:
   - `conditionDelta = beforeScore - afterScore` (positive = improvement)
   - `impliedAfterRisk = ((afterScore - 1) / 4) × 100`
   - `riskScoreDelta = prediction.riskScore - impliedAfterRisk`
   - `accuracy` label: `overestimated` (delta > 15), `accurate` (±15), `underestimated` (delta < -15)

These deltas are surfaced via `GET /api/analytics/model-accuracy`.

---

## 6. Database Models & Schemas

### `user.model.js` → collection: `users`
| Field | Type | Notes |
|---|---|---|
| `name` | String | required, trimmed |
| `email` | String | required, unique, lowercase |
| `password` | String | required, bcrypt hashed |
| `role` | String enum | `peon` \| `principal` \| `deo` \| `contractor` \| `admin` |
| `district` | String | optional |
| `phone` | String | optional |
| `schoolId` | Number | numeric CSV school ID (peon/principal only) |
| timestamps | — | createdAt, updatedAt |

### `school.model.js` → collection: `schools`
| Field | Type | Notes |
|---|---|---|
| `schoolId` | Number | unique, indexed |
| `name` | String | required |
| `district` | String | required, indexed |
| `block` | String | optional |
| `schoolType` | String enum | `Primary` \| `Secondary` |
| `isGirlsSchool` | Boolean | |
| `numStudents` | Number | |
| `infrastructure` | Object | `buildingAge`, `materialType`, `weatherZone` |
| `location` | Object | `lat`, `lng` — used for GPS validation |
| `isActive` | Boolean | default true |

### `school-condition-record.model.js` → collection: `school_condition_records`
| Field | Type | Notes |
|---|---|---|
| `schoolId` | Number | indexed |
| `schoolRef` | ObjectId | optional ref to School model |
| `district`, `block`, `schoolType` | String | |
| `isGirlsSchool` | Boolean | |
| `numStudents`, `buildingAge` | Number | |
| `materialType` | String enum | `RCC` \| `Brick` \| `Mixed` \| `Temporary` |
| `weatherZone` | String enum | `Dry` \| `Heavy Rain` \| `Coastal` \| `Tribal` |
| `category` | String enum | `plumbing` \| `electrical` \| `structural` |
| `weekNumber` | Number | ISO week |
| `conditionScore` | Number | 1–5, min/max validated |
| `issueFlag`, `waterLeak`, `wiringExposed`, `roofLeakFlag` | Boolean | |
| `crackWidthMM`, `toiletFunctionalRatio`, `powerOutageHours` | Number | |
| `photoUploaded` | Boolean | |
| `daysToFailure`, `willFailWithin30Days`, `willFailWithin60Days` | — | CSV ground truth labels |
| `priorityScore` | Number | CSV pre-computed |
| `repairDone`, `daysSinceRepair`, `contractorDelayDays`, `slaBreach` | — | |
| Unique index | — | `{schoolId, category, weekNumber}` |

### `maintenance-decision.model.js` → collection: `maintenance_decisions`
| Field | Type | Notes |
|---|---|---|
| `recordId` | ObjectId | ref SchoolConditionRecord |
| `schoolId` | Number | |
| `district`, `category`, `weekNumber` | — | |
| `decision.computedPriorityScore` | Number | indexed descending |
| `decision.priorityLevel` | String enum | `low` \| `medium` \| `high` \| `urgent` |
| `impact.studentsAffected`, `impact.isGirlsSchool`, `impact.criticalFacility` | — | |
| `explainability.reasons` | [String] | explainability array |
| `status` | String enum | `pending` \| `approved` \| `assigned` \| `completed` |

### `work-order.model.js` → collection: `work_orders`
| Field | Type | Notes |
|---|---|---|
| `decisionId` | ObjectId | optional ref to MaintenanceDecision |
| `schoolId` | Number | |
| `district`, `category` | String | |
| `assignment.assignedTo`, `assignment.assignedBy` | ObjectId | ref User |
| `priorityScore` | Number | |
| `status` | String enum | `pending` \| `assigned` \| `in_progress` \| `completed` \| `delayed` \| `cancelled` |
| `deadline` | Date | |
| `startedAt`, `completedAt` | Date | lifecycle |
| `completionProof.photoUrl`, `completionProof.gpsLocation` | — | |
| `locationMismatch` | Boolean | GPS validation result |

### `repair-log.model.js` → collection: `repair_logs`
| Field | Type | Notes |
|---|---|---|
| `workOrderId` | ObjectId | required |
| `decisionId` | ObjectId | optional (ML traceability) |
| `schoolId` | Number | indexed |
| `category` | String | |
| `before.conditionScore`, `before.issues` | — | |
| `after.conditionScore` | Number | |
| `completionTimeDays`, `contractorDelayDays` | Number | |
| `slaBreached`, `locationMismatch` | Boolean | |
| `photoUrl` | String | |
| `predictionSnapshot` | Object | riskScore, riskLevel, estimatedDaysToFailure, within30/60Days, deteriorationRate, evidence[] |
| `predictionError` | Object | beforeConditionScore, afterConditionScore, conditionDelta, riskScoreDelta, accuracy enum |

### `alert.model.js` → collection: `alerts`
| Field | Type | Notes |
|---|---|---|
| `schoolId` | Number | indexed |
| `district`, `category` | String | |
| `type` | String enum | `FAILURE_30_DAYS` \| `FAILURE_60_DAYS` \| `HIGH_PRIORITY` |
| `message` | String | |
| `isResolved` | Boolean | indexed, default false |

### `district-analytics.model.js` → collection: `district_analytics`
| Field | Type | Notes |
|---|---|---|
| `district` | String | indexed |
| `totalSchools`, `avgConditionScore`, `highPriorityCount` | Number | |
| `failureWithin30DaysCount`, `failureWithin60DaysCount` | Number | |
| `categoryBreakdown.plumbing/electrical/structural` | Number | high priority counts |
| `slaBreachCount` | Number | |
| `generatedAt` | Date | |

### `priorityConfig.model.js` → collection: `priority_config`
| Field | Type | Notes |
|---|---|---|
| `conditionWeights` | Object | good/minor/major/critical → 10/30/60/90 |
| `multipliers` | Object | girlsSchool ×1.5, criticalFacility ×1.6, studentImpact ×1.4 |
| `maxPriorityScore` | Number | default 100 |
| `version` | String | required |
| `isActive` | Boolean | partial unique index — only one active |
| `updatedBy` | ObjectId | ref User |

---

## 7. Frontend — Features & Implementation

### 7.1 Application Routing & Layout

**File:** `frontend/src/App.jsx`

| Route | Component | Access |
|---|---|---|
| `/` | `Landing` | Public |
| `/login` | `Login` | Public |
| `/signup` | `Signup` | Public |
| `/dashboard` | `AppLayout` → `DashboardIndex` | Protected |
| `/dashboard/report` | `AppLayout` → `WeeklyInputForm` | Protected |
| `/dashboard/work-orders` | `AppLayout` → `WorkOrders` | Protected |
| `/dashboard/work-orders/new` | `AppLayout` → `WorkOrders` | Protected |
| `*` | Redirect to `/login` | — |

**`DashboardIndex`** is role-aware:
- `peon` or `principal` role → `SchoolView`
- `deo` or `admin` role → `DEODashboard`
- `contractor` role → `WorkOrders`

### 7.2 Authentication Context & Flow

**File:** `frontend/src/context/AuthContext.jsx`

`AuthProvider` wraps the entire app and exposes `useAuth()` hook:

| Property/Method | Description |
|---|---|
| `user` | Current user object (null if logged out) |
| `loading` | True while session is being verified on mount |
| `login(email, password)` | POST `/api/auth/login` |
| `signup(data)` | POST `/api/auth/register` |
| `logout()` | POST `/api/auth/logout`, clears user state |
| `updateUser()` | Refreshes user from `/api/auth/me` |

On mount: calls `GET /api/auth/me` with `credentials: "include"` to restore session.

### 7.3 API Service Layer

**File:** `frontend/src/services/api.js`

Centralised HTTP helpers reading `VITE_API_URL` from env (default: `http://localhost:5000`):

| Function | Method | Notes |
|---|---|---|
| `get(path)` | GET | JSON, credentials include |
| `post(path, body)` | POST | JSON body |
| `put(path, body)` | PUT | JSON body |
| `patch(path, body)` | PATCH | JSON body |
| `del(path)` | DELETE | |
| `postFile(path, formData)` | POST | multipart/form-data, no Content-Type header set |

All functions handle 401 gracefully and catch network errors.

### 7.4 Landing Page

**File:** `frontend/src/pages/Landing.jsx`

Built with Tailwind CSS + framer-motion animations. Full marketing site with 10 section components:

| Component | Content |
|---|---|
| `Navbar` | Scroll-aware floating nav with progress bar, mobile menu, Dashboard CTA |
| `Hero2` | 3D phone mockup with mouse-parallax, typewriter headline, telemetry widgets |
| `Features2` | Bento-grid layout — Multi-Factor Forecast, Impact Bias Queue, 2-Min Audits |
| `GovSchemes` | Infinite scrolling capability ticker (8 engine capabilities) |
| `AppPreview` | 3D rotating phone with ConditionMeter gauge widget |
| `HowItWorks2` | Scroll-animated timeline with 4 steps: Report → Forecast → Rank → Resolve |
| `Testimonials` | Interactive bento photo grid for 4 use cases |
| `DownloadSection` | 3D phone with QR code hover reveal, live school counter |
| `Footer` | System status bar, navigation links, terminal aesthetic |

### 7.5 Login & Signup Pages

**Files:** `frontend/src/pages/Login.jsx`, `frontend/src/pages/Signup.jsx`

**Login:**
- 5 sandbox identity buttons (auto-fill email/password for each role)
- Password: `password123` for all demo accounts
- Error banner on invalid credentials
- JWT cookie set server-side on success

**Signup:**
- 5-role selector grid (peon, principal, deo, contractor, admin)
- Conditional `schoolId` field shown only for peon/principal roles
- AnimatePresence for smooth field show/hide
- Redirects to `/dashboard` on success

### 7.6 Protected Dashboard Shell

**File:** `frontend/src/components/AppLayout.jsx`

- Floating fixed navbar (scroll-aware styling — compact on scroll)
- Role-based nav items:
  - `peon`: Dashboard + Submit Report
  - `principal`: My School + Submit Report
  - `deo`: Overview + Work Orders
  - `contractor`: My Tasks + All Orders
  - `admin`: Admin Panel + All Orders
- User profile dropdown with name, email, sign out
- Mobile hamburger menu with AnimatePresence
- Role badge display (color-coded)

**File:** `frontend/src/components/ProtectedRoute.jsx`

- Redirects unauthenticated users to `/login` with `state.from` for post-login redirect
- Shows spinner during auth loading

### 7.7 School View (Peon/Principal Role)

**File:** `frontend/src/pages/SchoolView.jsx`

Fetches data from 3 endpoints in parallel on mount:
1. `GET /api/risk/:schoolId` — live engine predictions per category
2. `GET /api/condition-report?schoolId=:id&limit=20` — report history
3. `GET /api/schools/:schoolId` — school metadata

**Features:**
- **Risk Gauge** — SVG circular gauge showing 0–100 composite risk score, color-coded by level
- **Prediction Summary panel** — time to failure, trend (↗/↘/→), worst category, report count
- **Per-category breakdown** — horizontal bar chart per category with risk level badge
- **Condition Records list** — each record shows category, week, condition score, issue flags (waterLeak, wiringExposed, roofLeakFlag), failure window badges

**Access guard:** Only `peon`, `principal` roles with a linked `schoolId` can access this view.

### 7.8 DEO Dashboard

**File:** `frontend/src/pages/DEODashboard.jsx`

The primary DEO interface. Calls `GET /api/risk/queue` with filter params.

**Features:**
- 4 stat cards: Schools at Risk, Critical Priority, High Priority, Avg Days to Failure
- Filter bar: district text input, block text input, category dropdown, 30/60-day urgency toggle
- Priority queue table with columns: School & Location, At-Risk Categories, Days to Failure, Student Impact, Indicators, Actions
- Days-to-failure progress bar (red < 15d, orange < 30d, blue otherwise)
- Girls' school badge
- Evidence clue count badge
- **Assign button** → navigates to `/dashboard/work-orders/new?schoolId=...&school=...&category=...&score=...`
- Row click → opens **EvidenceDrawer** (slide-out panel with full evidence list)
- Predictive Aggregation Logic explanation callout at bottom

### 7.9 Weekly Condition Report Form

**File:** `frontend/src/pages/WeeklyInputForm.jsx`

**Features:**
- Access guard: only `peon` and `principal` with linked schoolId
- School metadata header (district, block, building age, students, weather zone)
- ISO week number auto-computed, editable
- **3 category tabs** (plumbing, electrical, structural) with icons
- Per-tab panel:
  - **Condition Score selector** (1–5 buttons with color labels: Excellent/Good/Fair/Poor/Critical)
  - **Issue flags checkboxes** (category-specific: waterLeak, wiringExposed, roofLeakFlag, issueFlag)
  - **Numeric fields** (category-specific: toiletFunctionalRatio, powerOutageHours, crackWidthMM)
- **Per-category summary strip** — shows current score/5 for each category at a glance
- Submits all 3 categories sequentially via `POST /api/condition-report`
- **Success screen** shows per-category result (saved/failed)

### 7.10 Work Orders Page (Contractor Role)

**File:** `frontend/src/pages/WorkOrders.jsx`

**Features:**
- Role-aware: contractors see only their assigned orders; DEO/admin see all
- Status filter tabs with counts (all/pending/assigned/in_progress/completed)
- SLA Metric Card shown when breached orders exist
- Order cards with: category icon, priority badge, SLA breach badge (animated), description, school/contractor/deadline/delay grid
- **Assign Now** button (DEO/admin) → PATCH status to assigned
- **Close Order** button → opens CompletionModal
- **New Assignment** panel (DEO/admin) → slide-over form with school selector, category, priority, description, contractor assignment, due date
- Auto-opens new assignment panel when redirected from DEO dashboard with prefill params

### 7.11 Completion Modal (GPS + Photo Proof)

**File:** `frontend/src/components/CompletionModal.jsx`

Contractor work completion form. PS-03 requirement.

**Features:**
- **Pre-Repair Score** and **Post-Repair Score** selectors (1–5 buttons)
- **GPS Validation panel**: auto-requests `navigator.geolocation` on mount; shows detecting/captured/denied states
- **Evidence Photo panel**: placeholder image with hover-change UX
- **Notes textarea**
- Submits `POST /api/tasks/complete` with lat/lng, scores, notes, photoUrl
- GPS timeout: 5s (noted in `remaining.md` as needing increase to 10s with Retry button)

### 7.12 Evidence Drawer

**File:** `frontend/src/components/EvidenceDrawer.jsx`

Right-side slide-out panel opened from DEO dashboard row click:
- School name in header
- At-risk categories chip list
- Supporting indicators list (evidence items as bullet cards)
- Methodology explanation note
- Methodology note explains engine is based on 4-week trends + weather modifiers

### 7.13 Reusable UI Components

**Directory:** `frontend/src/components/ui/`

| Component | Description |
|---|---|
| `PageHeader` | Consistent page title + optional subtitle, supports `cinematic` variant |
| `Card` | Styled card container with configurable padding, shadow, hover |
| `PrimaryButton` | Multi-variant button (primary/secondary/outline/danger) with loading state |
| `Select` | Styled select dropdown with chevron icon |
| `InputField` | Text/number input with label, error, helper text, icon support |

---

## 8. API Endpoints Reference

### Server-level
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Server status + API cheat sheet |
| GET | `/api/seed-demo` | None | Run demo seed (inserts sample data) |
| GET | `/uploads/:filename` | None | Serve uploaded files |

### Authentication (`/api/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create new user account |
| POST | `/api/auth/login` | None | Login, set HttpOnly cookie |
| POST | `/api/auth/logout` | None | Clear auth cookie |
| GET | `/api/auth/me` | JWT | Get current user |

### Profile (`/api/me`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/me/` | JWT | Get own profile |
| PUT | `/api/me/` | JWT | Update profile |
| PUT | `/api/me/password` | JWT | Change password |

### Schools (`/api/schools`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/schools/` | JWT | List all schools (aggregated from records) |
| GET | `/api/schools/:id` | JWT | Get school by numeric ID |

### Condition Reports
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/api/reports/` | JWT | peon, principal, deo, admin | Submit weekly report (multipart) |
| GET | `/api/reports/` | JWT | All | List reports with filters |
| GET | `/api/reports/:school_id` | JWT | All | Reports for specific school |

*(Also aliased at `/api/condition-report`)*

### Risk Scores
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/risk/all` | JWT | deo, admin, contractor | All latest predictions (stored values) |
| GET | `/api/risk/queue` | JWT | deo, admin | Prioritised maintenance queue aggregated by school |
| GET | `/api/risk/` | JWT | deo, admin | Legacy risk-scores aggregation |
| GET | `/api/risk/:school_id` | JWT | All | Live engine predictions for one school |

*(Also aliased at `/api/risk-scores`)*

### Maintenance Queue
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/maintenance-queue` | JWT | deo, admin, contractor | Alias for risk/queue |

### Tasks / Work Orders
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/tasks/` | JWT | All | List tasks (role-filtered) |
| POST | `/api/tasks/assign` | JWT | deo, admin | Create & assign work order |
| POST | `/api/tasks/complete` | JWT | contractor, deo, admin | Complete task with GPS+photo |
| PATCH | `/api/tasks/:id/status` | JWT | deo, admin | Update task status |

*(Also aliased at `/api/work-orders`)*

### Alerts
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/alerts/` | JWT | List unresolved alerts |
| GET | `/api/alerts/digest` | JWT | Aggregated alert digest by district+category |
| PATCH | `/api/alerts/:id/read` | JWT | Mark alert as resolved |

### Analytics
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/analytics/` | JWT | All | District analytics |
| POST | `/api/analytics/update` | JWT | All | Recompute district analytics |
| GET | `/api/analytics/model-accuracy` | JWT | deo, admin | Prediction error analytics per category/district |

### Maintenance (New Flow)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/maintenance/decisions` | JWT | Create maintenance decision |
| POST | `/api/maintenance/work-orders` | JWT | Create work order (raw) |
| POST | `/api/maintenance/repair-logs` | JWT | Log completed repair with prediction feedback |

### School Conditions
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/school-conditions/` | JWT | List condition records |
| POST | `/api/school-conditions/` | JWT | Create condition record |

### Admin
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/admin/stats` | JWT | admin | System-wide stats |
| GET | `/api/admin/users` | JWT | admin | List all users |
| DELETE | `/api/admin/users/:id` | JWT | admin | Delete user |
| GET | `/api/admin/load-csv` | JWT | admin | Trigger CSV import pipeline |
| GET | `/api/admin/priority-config` | JWT | deo, admin | Get active scoring config |
| PUT | `/api/admin/priority-config` | JWT | admin | Update scoring config + flush engine cache |

---

## 9. Configuration & Tooling

### Vite (`frontend/vite.config.js`)
- Plugin: `@vitejs/plugin-react` (includes JSX handling for `.js` files)
- Dev server port: `5173`
- Build output: `dist/` with source maps
- esbuild loader: `jsx` for all `.js` and `.jsx` src files

### Tailwind CSS (`frontend/tailwind.config.js`)
- Content paths: `index.html`, `src/**/*.{js,jsx}`
- No custom theme extensions (uses Tailwind 3 defaults)

### PostCSS (`frontend/postcss.config.js`)
- Plugins: `tailwindcss`, `autoprefixer`

### Rate Limiter (`backend/middleware/rateLimiter.js`)
- Window: 15 minutes, Max: 200 requests per IP
- Applied to: all `/api/*` routes

### Multer (`backend/config/multer.js`)
- Storage: disk → `backend/uploads/`
- File filter: image MIME types + extension check
- File size limit: 10 MB

---

## 10. Scripts & Utilities

| Command | Description |
|---|---|
| `npm run dev` (frontend) | Vite dev server at `localhost:5173` |
| `npm run build` (frontend) | Production bundle → `frontend/dist/` |
| `npm run dev` (backend) | Express with nodemon |
| `npm run start` (backend) | Production: `node server.js` |
| `npm run load-csv` (backend) | Stream `TS-PS3.csv` → MongoDB |
| `node scripts/clearDB.js` | Drop all documents from all collections |
| `node scripts/listCollections.js` | List collections with counts + samples |
| `GET /api/seed-demo` | HTTP-triggered demo seed (5 users, 2 schools, sample records) |

---

## 11. Environment Variables

### Backend (`.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | 5000 | Express server port |
| `NODE_ENV` | development | Environment mode |
| `MONGODB_URI` | `mongodb://localhost:27017/predictive_maintenance` | MongoDB connection string |
| `JWT_SECRET` | — | Secret key for JWT signing |
| `JWT_EXPIRE` | 7d | Token expiry |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |

### Frontend (`.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Backend API base URL |

---

## 12. Deployment Configuration

### Frontend — Vercel (`frontend/vercel.json`)
- SPA rewrite: all routes → `index.html` (enables React Router client-side routing on Vercel)
- Separate rules for `/avatars/*` and `/assets/*` static files
- Build output: `dist`

### Backend
- Standard Node.js deployment (Railway, Render, etc.)
- Requires MongoDB Atlas URI in env
- `npm run start` for production

---

## 13. Known Issues & Gaps

| Issue ID | Component | Problem | Status |
|---|---|---|---|
| **ISSUE-01** | Backend | `seed.js` imports `./models/School.js`, `ConditionReport.js`, `WorkOrder.js` — paths don't match current filenames | Open |
| **ISSUE-02** | Backend | `verify_gps.js` imports `./backend/models/index.js` instead of `../models/index.js` | Open |
| **ISSUE-03** | Frontend | GPS timeout in `CompletionModal.jsx` is 5s — too short for mobile; no retry button | Open |
| **ISSUE-04** | Frontend | Principal role renders same `SchoolView` as peon — no dedicated principal dashboard with trend analysis | Open |
| **ISSUE-05** | Frontend | No "Flagged" tab in DEO Dashboard for GPS-mismatch work orders | Open |
| **ISSUE-06** | Frontend | SLA breach analytics (avg delay days per contractor) not surfaced in any UI | Open |
| **ISSUE-07** | Backend | Dual work order APIs: `/api/tasks` and `/api/work-orders` — should be consolidated | Open |
| **ISSUE-08** | Documentation | `README.md` Architecture section references old role names (`school` instead of `peon`/`principal`) and old model filenames | Open |
| **ISSUE-09** | Frontend | `WorkOrders.jsx` `NewWorkOrderPanel` loads contractors via `/api/admin/users` — non-admin roles (DEO) may not have access | Open |
| **ISSUE-10** | Backend | No `express-validator` on report submission or task completion endpoints | Open |
