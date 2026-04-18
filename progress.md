# Tarkshaastra — Project Progress Document

> **Project Name:** Saksham (Platform) / Tarkshaastra (Repo)
> **Stack:** React 18 + Vite (Frontend) · Express + Mongoose (Backend) · MongoDB (Database)
> **Last Updated:** April 18, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Technology Stack](#3-technology-stack)
4. [Backend — Features & Implementation](#4-backend--features--implementation)
   - 4.1 [Server Setup & Middleware](#41-server-setup--middleware)
   - 4.2 [Authentication & Authorization](#42-authentication--authorization)
   - 4.3 [User Profiles](#43-user-profiles)
   - 4.4 [School Management](#44-school-management)
   - 4.5 [Condition Reports (Weekly Input)](#45-condition-reports-weekly-input)
   - 4.6 [Risk Prediction Engine](#46-risk-prediction-engine)
   - 4.7 [Risk Score API](#47-risk-score-api)
   - 4.8 [Maintenance Queue](#48-maintenance-queue)
   - 4.9 [Tasks / Work Orders (PS-03 Flow)](#49-tasks--work-orders-ps-03-flow)
   - 4.10 [Legacy Work Orders API](#410-legacy-work-orders-api)
   - 4.11 [Alerts System](#411-alerts-system)
   - 4.12 [District Analytics](#412-district-analytics)
   - 4.13 [Maintenance Decisions, Work Orders & Repair Logs](#413-maintenance-decisions-work-orders--repair-logs)
   - 4.14 [School Conditions](#414-school-conditions)
   - 4.15 [Admin Panel](#415-admin-panel)
   - 4.16 [CSV Bulk Import Pipeline](#416-csv-bulk-import-pipeline)
   - 4.17 [File Upload System](#417-file-upload-system)
5. [Database Models & Schemas](#5-database-models--schemas)
6. [Frontend — Features & Implementation](#6-frontend--features--implementation)
   - 6.1 [Application Routing & Layout](#61-application-routing--layout)
   - 6.2 [Authentication Context & Flow](#62-authentication-context--flow)
   - 6.3 [API Service Layer](#63-api-service-layer)
   - 6.4 [Landing Page](#64-landing-page)
   - 6.5 [Login & Signup Pages](#65-login--signup-pages)
   - 6.6 [Protected Dashboard Shell](#66-protected-dashboard-shell)
   - 6.7 [School View (School Role)](#67-school-view-school-role)
   - 6.8 [DEO Dashboard (DEO / Admin Role)](#68-deo-dashboard-deo--admin-role)
   - 6.9 [Weekly Condition Report Form](#69-weekly-condition-report-form)
   - 6.10 [Work Orders Page (Contractor Role)](#610-work-orders-page-contractor-role)
   - 6.11 [Reusable UI Components](#611-reusable-ui-components)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Configuration & Tooling](#8-configuration--tooling)
9. [Scripts & Utilities](#9-scripts--utilities)
10. [Environment Variables](#10-environment-variables)
11. [Deployment Configuration](#11-deployment-configuration)
12. [Known Issues & Gaps](#12-known-issues--gaps)

---

## 1. Project Overview

**Saksham** is a school infrastructure monitoring and maintenance management platform built for district-level education officials in India. The system allows:

- **Schools** to submit weekly infrastructure condition reports with photo evidence
- **DEOs (District Education Officers)** to view AI/rule-based risk scores across all schools and prioritise repairs
- **Contractors** to receive, execute, and mark work orders as complete with proof images
- **Admins** to manage users, bulk-load historical data, and view system-wide statistics

The platform uses a **rule-based prediction engine** to calculate risk scores across infrastructure categories (roof, walls, floors, electrical, plumbing, etc.) and surfaces high-priority schools for immediate intervention.

---

## 2. Repository Structure

```
D:\Tarkshaastra\
├── README.md                     # Project overview & setup guide
├── .gitignore
├── TS-PS3.csv                    # Historical data CSV for bulk import
├── package-lock.json             # Root lockfile
│
├── frontend/                     # Vite + React 18 SPA
│   ├── index.html                # Vite entry HTML
│   ├── public/index.html         # Secondary/static entry
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
│       ├── components/           # Shared + feature components
│       ├── context/              # AuthContext
│       └── services/             # API service (api.js)
│
└── backend/                      # Express + Mongoose API server
    ├── server.js                 # App entry, route mounting, CORS
    ├── seed.js                   # Demo seed script (legacy)
    ├── package.json
    ├── .env / .env.example
    ├── config/
    │   ├── database.js           # Mongoose connection
    │   └── multer.js             # File upload config
    ├── controllers/              # Request handlers
    ├── middlewares/              # auth.middleware.js (JWT)
    ├── middleware/               # rateLimiter.js
    ├── models/                   # Mongoose schemas
    ├── routes/                   # Express routers
    ├── services/                 # predictionEngine.js
    ├── Methods/                  # bcryptPassword.js
    ├── scripts/                  # CLI utility scripts
    └── uploads/                  # Served at /uploads (static)
```

---

## 3. Technology Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| react-router-dom | 6 | Client-side routing |
| Vite | 5 | Build tool & dev server |
| Tailwind CSS | 3 | Utility-first CSS framework |
| PostCSS + Autoprefixer | — | CSS pipeline |
| framer-motion | latest | Animations & transitions |
| lucide-react | latest | Icon library |

### Backend
| Package | Purpose |
|---|---|
| Express | HTTP server framework |
| Mongoose | MongoDB ODM |
| dotenv | Environment variable loading |
| cors | Cross-Origin Resource Sharing |
| cookie-parser | HTTP cookie handling |
| jsonwebtoken | JWT generation & verification |
| bcryptjs | Password hashing |
| multer | Multipart file upload handling |
| uuid | Unique ID generation |
| express-rate-limit | API rate limiting |
| nodemon (dev) | Auto-restart on file changes |

### Database
- **MongoDB** (via `MONGODB_URI` env var) — document store for all collections

---

## 4. Backend — Features & Implementation

### 4.1 Server Setup & Middleware

**File:** `backend/server.js`

- Express app created and configured
- **CORS** enabled with `origin: process.env.FRONTEND_URL` and `credentials: true` (supports cookies)
- **`cookie-parser`** middleware for reading HttpOnly cookies
- **`express.json()`** body parsing
- **Rate limiter** applied to all `/api` routes — 200 requests per 15-minute window per IP
- Static file serving for `/uploads` directory
- All route modules mounted (see §7 for full API table)
- `GET /health` endpoint returns server status + full API cheat sheet

### 4.2 Authentication & Authorization

**Files:** `backend/controllers/auth.controller.js`, `backend/middlewares/auth.middleware.js`, `backend/routes/auth.routes.js`

**Implemented:**
- **Registration** (`POST /api/auth/register`) — hashes password with bcrypt, creates user, issues JWT
- **Login** (`POST /api/auth/login`) — validates credentials, sets HttpOnly cookie `token` + returns user data
- **Logout** (`POST /api/auth/logout`) — clears `token` cookie
- **Get current user** (`GET /api/auth/me`) — decodes JWT from cookie or `Authorization: Bearer` header

**JWT Strategy:**
- Token stored in HttpOnly cookie (`token`) for browser sessions
- Optionally read from `Authorization: Bearer <token>` header for programmatic access
- `protect` middleware validates token and attaches `req.user`
- `authorize(...roles)` middleware restricts routes to specific roles

**Roles defined:**
| Role | Access |
|---|---|
| `school` | Submit reports, view own school risk |
| `deo` | View all risk scores, maintenance queue, work orders |
| `contractor` | View and complete assigned work orders |
| `admin` | Full access including user management and CSV load |

**Password Utility:** `backend/Methods/bcryptPassword.js` — standalone bcrypt helper module

### 4.3 User Profiles

**Files:** `backend/controllers/profile.controller.js`, `backend/routes/profile.routes.js`

Mounted at `/api/me` (all routes require `protect`):
- `GET /api/me/` — get own profile
- `PUT /api/me/` — update profile fields (name, phone, district, etc.)
- `PUT /api/me/password` — change password (verifies old password before updating)

### 4.4 School Management

**Files:** `backend/controllers/school.controller.js`, `backend/routes/school.routes.js`

- `GET /api/schools/` — list all schools (protected); supports query filters (district, block, type)
- `GET /api/schools/:id` — get single school by `schoolId`

Schools store: `schoolId`, `name`, `district`, `block`, `type`, `isGirlsSchool`, `numberOfStudents`, and `infrastructure` sub-document (`buildingAge`, `material`, `weatherZone`).

### 4.5 Condition Reports (Weekly Input)

**Files:** `backend/controllers/report.controller.js`, `backend/routes/report.routes.js`

Mounted at **`/api/reports`** and **`/api/condition-report`** (same router, two aliases):

- `POST /` — submit a weekly condition report
  - Roles: `school`, `deo`, `admin`
  - Accepts multipart form data with **image uploads** (via multer)
  - Triggers risk prediction for the school after submission
- `GET /` — list all reports; supports filters (school, category, date range, priority)
- `GET /:school_id` — get all reports for a specific school

Report schema captures: school ID, week number, infrastructure category, condition score (1–5 scale), specific issues noted, images array, and the prediction result from the engine.

### 4.6 Risk Prediction Engine

**File:** `backend/services/predictionEngine.js`

Core rule-based AI service with no external ML dependency:

**`predictRiskForCategory(categoryData, schoolMeta)`**
- Accepts a condition score + school metadata
- Applies weighted rules: condition score, building age, material type, weather zone
- Returns: `{ riskScore, riskLevel, priority, recommendations[] }`

**`analyseSchool(schoolId)`**
- Aggregates all condition records for a school
- Runs `predictRiskForCategory` per category
- Returns composite risk profile with per-category breakdowns

**Constants defined:**
| Constant | Description |
|---|---|
| Category weights | Roof > Electrical > Plumbing > Walls > Floors (configurable) |
| Weather zone multipliers | Coastal/High-rain zones increase risk score |
| Age degradation factors | Older buildings receive higher base risk |
| Material risk factors | Temporary/bamboo > RCC/brick for risk |

### 4.7 Risk Score API

**Files:** `backend/controllers/risk.controller.js`, `backend/routes/risk.routes.js`

Mounted at **`/api/risk`** and **`/api/risk-scores`** (same router):

- `GET /` — get composite risk scores for all schools in a district (deo/admin)
- `GET /all` — get all risk records across all districts (deo/admin/contractor)
- `GET /:school_id` — get risk breakdown for a specific school

### 4.8 Maintenance Queue

**Controller:** `backend/controllers/risk.controller.js` (inline handler)

- `GET /api/maintenance-queue` — returns schools sorted by risk score, filtered to actionable priority levels
- Protected: `protect` + `authorize('deo', 'admin', 'contractor')`

### 4.9 Tasks / Work Orders (PS-03 Flow)

**Files:** `backend/controllers/workorder.controller.js` (primary PS-03 controller), `backend/routes/task.routes.js`

Mounted at **`/api/tasks`** (primary):

- `GET /api/tasks/` — list tasks/work orders (role-filtered)
- `POST /api/tasks/assign` — create and assign a new work order to a contractor
- `POST /api/tasks/complete` — mark work order complete; accepts multipart `completionImage` upload
- `PATCH /api/tasks/:id/status` — update status of a work order (e.g., in-progress → completed)

### 4.10 Legacy Work Orders API

**Files:** `backend/controllers/workorder.controller.js`, `backend/routes/workorder.routes.js`

Mounted at **`/api/work-orders`** (alias, used by the current frontend `WorkOrders.jsx`):

- `GET /api/work-orders/` — same as tasks list
- `POST /api/work-orders/assign`
- `POST /api/work-orders/complete`
- `PATCH /api/work-orders/:id/status`

### 4.11 Alerts System

**Files:** `backend/controllers/alert.controller.js`, `backend/routes/alert.routes.js`

- `GET /api/alerts/` — list alerts for the current user (priority/failure types)
- `PATCH /api/alerts/:id/read` — mark an alert as read

Alerts are created automatically when risk scores cross thresholds (during report submission / CSV load).

### 4.12 District Analytics

**Files:** `backend/controllers/analytics.controller.js`, `backend/routes/analytics.routes.js`

- `GET /api/analytics/` — get aggregated district-level statistics
- `POST /api/analytics/update` — recompute and store district analytics snapshot

Stores: total schools, at-risk count, pending repairs, completion rates per district.

### 4.13 Maintenance Decisions, Work Orders & Repair Logs

**Files:** `backend/controllers/maintenance.controller.js`, `backend/routes/maintenance.routes.js`

Newer schema path (parallel to PS-03 flow):

- `POST /api/maintenance/decisions` — create a maintenance decision linked to a condition record
- `POST /api/maintenance/work-orders` — create a work order from a maintenance decision
- `POST /api/maintenance/repair-logs` — log a completed repair (before/after scores, SLA tracking)

### 4.14 School Conditions

**Files:** `backend/controllers/schoolCondition.controller.js`, `backend/routes/schoolCondition.routes.js`

- `POST /api/school-conditions/` — create a school condition record directly
- `GET /api/school-conditions/` — list school condition records (no auth guard in router — open)

### 4.15 Admin Panel

**Files:** `backend/controllers/admin.controller.js`, `backend/routes/admin.routes.js`

All routes: `protect` + `authorize('admin')`

- `GET /api/admin/stats` — system-wide stats (user count, school count, reports, open work orders)
- `GET /api/admin/users` — list all users
- `DELETE /api/admin/users/:id` — delete a user
- `GET /api/admin/load-csv` — trigger the CSV bulk import pipeline

### 4.16 CSV Bulk Import Pipeline

**File:** `backend/scripts/loadCSV.js`

- Streams `TS-PS3.csv` (historical PS-03 data) row by row using Node.js streams
- Populates:
  - `school_condition_records` — condition data per school per category per week
  - `maintenance_decisions` — derived decisions from high-risk records
  - `alerts` — auto-generated alerts for critical records
  - `district_analytics` — aggregated analytics per district
- Can be triggered via `npm run load-csv` or `GET /api/admin/load-csv`

### 4.17 File Upload System

**File:** `backend/config/multer.js`

- **Storage:** disk storage under `backend/uploads/`
- **Accepted types:** images (jpeg, jpg, png, gif, webp)
- **Size limit:** 10 MB per file
- Uploaded files served statically at `/uploads/<filename>`
- Used by: condition report submission, task/work order completion proof

---

## 5. Database Models & Schemas

### `user.model.js` → collection: `users`
| Field | Type | Notes |
|---|---|---|
| `name` | String | required |
| `email` | String | required, unique, lowercase |
| `password` | String | required, hashed |
| `role` | String enum | `school`, `deo`, `contractor`, `admin` |
| `district` | String | — |
| `phone` | String | — |
| `schoolId` | String | for school-role users |
| timestamps | — | createdAt, updatedAt |

### `school.model.js` → collection: `schools`
| Field | Type | Notes |
|---|---|---|
| `schoolId` | Number | unique |
| `name` | String | — |
| `district` | String | — |
| `block` | String | — |
| `type` | String | primary / upper-primary / secondary / higher-secondary |
| `isGirlsSchool` | Boolean | — |
| `numberOfStudents` | Number | — |
| `infrastructure` | Object | `buildingAge`, `material`, `weatherZone` |

### `school-condition-record.model.js` → collection: `school_condition_records`
| Field | Type | Notes |
|---|---|---|
| `schoolId` | Number | ref |
| `category` | String | infrastructure category |
| `weekNumber` | Number | ISO week |
| `conditionScore` | Number | 1–5 scale |
| `issues` | [String] | list of identified problems |
| `images` | [String] | uploaded image paths |
| `prediction` | Object | result from predictionEngine |
| `priority` | String | low / medium / high / critical |
| `needsRepair` | Boolean | — |
| Unique index | — | `schoolId + category + weekNumber` |

### `maintenance-decision.model.js` → collection: `maintenance_decisions`
| Field | Type | Notes |
|---|---|---|
| `conditionRecordId` | ObjectId | ref to record |
| `schoolId` | Number | — |
| `priority` | String | — |
| `estimatedImpact` | String | — |
| `explainability` | String | reason for decision |
| `status` | String | pending / approved / rejected |

### `work-order.model.js` → collection: `work_orders`
| Field | Type | Notes |
|---|---|---|
| `decisionId` | ObjectId | ref to maintenance decision |
| `schoolId` | Number | — |
| `assignedTo` | ObjectId | ref to user (contractor) |
| `priority` | String | — |
| `status` | String | pending / in-progress / completed |
| `deadline` | Date | — |
| `completionProof` | String | image path |
| timestamps | — | — |

### `repair-log.model.js` → collection: `repair_logs`
| Field | Type | Notes |
|---|---|---|
| `workOrderId` | ObjectId | — |
| `beforeScore` | Number | condition score before repair |
| `afterScore` | Number | condition score after repair |
| `slaMetDeadline` | Boolean | — |
| `notes` | String | — |
| timestamps | — | — |

### `alert.model.js` → collection: `alerts`
| Field | Type | Notes |
|---|---|---|
| `type` | String | `failure` / `priority` |
| `schoolId` | Number | — |
| `message` | String | — |
| `isRead` | Boolean | default false |
| `userId` | ObjectId | target user |
| timestamps | — | — |

### `district-analytics.model.js` → collection: `district_analytics`
| Field | Type | Notes |
|---|---|---|
| `district` | String | — |
| `totalSchools` | Number | — |
| `atRiskCount` | Number | — |
| `pendingRepairs` | Number | — |
| `completionRate` | Number | percentage |
| `snapshot` | Date | when computed |

### `priorityConfig.model.js` → collection: `priority_config`
| Field | Type | Notes |
|---|---|---|
| `weights` | Object | tunable category weights |
| `isActive` | Boolean | only one active config |
| Unique index | — | partial on `isActive: true` |

---

## 6. Frontend — Features & Implementation

### 6.1 Application Routing & Layout

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
- `school` role → renders `SchoolView`
- `deo` / `admin` role → renders `DEODashboard`
- `contractor` role → renders `WorkOrders`

### 6.2 Authentication Context & Flow

**File:** `frontend/src/context/AuthContext.jsx`

`AuthProvider` wraps the entire app and exposes `useAuth()` hook providing:

| Property/Method | Description |
|---|---|
| `user` | Current user object (null if logged out) |
| `loading` | True while session is being verified |
| `login(email, password)` | POST `/api/auth/login`, sets user state |
| `signup(data)` | POST `/api/auth/register`, sets user state |
| `logout()` | POST `/api/auth/logout`, clears user state |

On mount: calls `GET /api/auth/me` with `credentials: "include"` to restore session from HttpOnly cookie.

### 6.3 API Service Layer

**File:** `frontend/src/services/api.js`

Centralised HTTP helpers reading `VITE_API_URL` from environment:

| Function | Method | Notes |
|---|---|---|
| `get(path)` | GET | JSON, credentials |
| `post(path, body)` | POST | JSON body, credentials |
| `put(path, body)` | PUT | JSON body, credentials |
| `patch(path, body)` | PATCH | JSON body, credentials |
| `del(path)` | DELETE | credentials |
| `postFile(path, formData)` | POST | multipart/form-data, credentials |

All functions include `credentials: "include"` for cookie-based auth.

### 6.4 Landing Page

**File:** `frontend/src/pages/Landing.jsx`

**Components (`frontend/src/components/landing/`):**

| Component | Content |
|---|---|
| `Navbar` | Top nav with logo, links, CTA button; scroll-aware styling |
| `Hero` | Primary hero section with headline, sub-text, CTA buttons |
| `Hero2` | Secondary hero / product showcase section |
| `Features` | Feature highlight cards (3–4 key features) |
| `Features2` | Extended features / benefit grid |
| `GovSchemes` | Government schemes & compliance section |
| `AppPreview` | Dashboard/app screenshot preview section |
| `HowItWorks2` | Step-by-step how it works (with numbered steps) |
| `Testimonials` | User testimonial cards |
| `CTA` | Call-to-action banner / signup prompt |
| `DownloadSection` | App download / access CTA |
| `Footer` | Site footer with links and copyright |

Built with **Tailwind CSS** and **framer-motion** animations.

### 6.5 Login & Signup Pages

**Files:** `frontend/src/pages/Login.jsx`, `frontend/src/pages/Signup.jsx`

- Form-based authentication using `useAuth()` context methods
- Role selection available on signup (`school`, `deo`, `contractor`)
- Redirect to `/dashboard` on success
- Error display for invalid credentials

### 6.6 Protected Dashboard Shell

**File:** `frontend/src/components/AppLayout.jsx`

- Persistent navigation sidebar / header
- Role-based nav links (school sees "Report", contractor sees "Work Orders", deo/admin see risk dashboard)
- **Logout** button calls `logout()` from `useAuth` and redirects to `/login`
- Renders `children` (page content) in main area

**File:** `frontend/src/components/ProtectedRoute.jsx`

- Wraps all `/dashboard/*` routes
- Redirects unauthenticated users to `/login`
- Shows loading state while auth is being verified

### 6.7 School View (School Role)

**File:** `frontend/src/pages/SchoolView.jsx`

Accessed by users with role `school` after login. Features:

- **School details panel** — fetches `GET /api/schools/:id` to show school name, district, block, student count, infrastructure details
- **Risk score summary** — fetches `GET /api/risk-scores/:id` to display current risk level per category
  - Visual risk indicators (color-coded: low/medium/high/critical)
  - Per-category breakdown (roof, walls, electrical, plumbing, etc.)
- **Condition report history** — fetches `GET /api/condition-report/:school_id`
  - Lists all submitted reports sorted by date
  - Shows category, condition score, issues, and attached images
- **Navigate to report form** — links to `/dashboard/report`

### 6.8 DEO Dashboard (DEO / Admin Role)

**File:** `frontend/src/pages/DEODashboard.jsx`

Accessed by users with role `deo` or `admin`. Features:

- **All-schools risk list** — fetches `GET /api/risk-scores`
  - Table/card view of all schools with their composite risk score
  - Color-coded risk levels
  - Sortable by risk score / district / block
- **Priority queue** — highlights critical and high-priority schools requiring immediate attention
- Navigate to individual school details

### 6.9 Weekly Condition Report Form

**File:** `frontend/src/pages/WeeklyInputForm.jsx`

Accessible via `/dashboard/report`. Features:

- Multi-field form capturing:
  - Infrastructure **category** selection (roof, walls, floors, electrical, plumbing, etc.)
  - **Condition score** slider / selector (1–5 scale)
  - **Issues checklist** or free-text issues description
  - **Photo upload** — one or more images as evidence
- Submits as multipart form data via `postFile` → `POST /api/condition-report`
- Success/error feedback after submission
- Redirects or resets form on success

### 6.10 Work Orders Page (Contractor Role)

**File:** `frontend/src/pages/WorkOrders.jsx`

Accessible via `/dashboard/work-orders`. Features:

- **List work orders** — fetches `GET /api/work-orders` filtered to contractor's assignments
- **Assign work order** (deo/admin) — form to assign a new order: school selector (from `/api/schools`), contractor selector (from `/api/admin/users`), priority, deadline
- **Mark complete** — contractor uploads completion image, submits `POST /api/work-orders/complete`
- **Status update** — `PATCH /api/work-orders/:id/status` for intermediate status changes (in-progress, etc.)
- Status badges: pending / in-progress / completed

### 6.11 Reusable UI Components

**Directory:** `frontend/src/components/ui/`

| Component | Description |
|---|---|
| `PageHeader` | Consistent page title + optional subtitle bar |
| `Card` | Styled card container with shadow and padding |
| `PrimaryButton` | Styled primary action button |
| `Select` | Styled select/dropdown input |
| `InputField` | Styled text/number input with label |

---

## 7. API Endpoints Reference

### Server-level
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Server status + API cheat sheet |
| GET | `/api/seed-demo` | None | Run demo seed |
| GET | `/uploads/:filename` | None | Serve uploaded files |

### Authentication (`/api/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create new user account |
| POST | `/api/auth/login` | None | Login, set cookie |
| POST | `/api/auth/logout` | None | Clear auth cookie |
| GET | `/api/auth/me` | JWT | Get current user |

### Profile (`/api/me`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/me/` | JWT | Get own profile |
| PUT | `/api/me/` | JWT | Update profile |
| PUT | `/api/me/password` | JWT | Change password |

### Schools (`/api/schools`)
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/schools/` | JWT | All | List all schools |
| GET | `/api/schools/:id` | JWT | All | Get school by ID |

### Condition Reports
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/api/condition-report/` | JWT | school, deo, admin | Submit weekly report (multipart) |
| GET | `/api/condition-report/` | JWT | All | List reports |
| GET | `/api/condition-report/:school_id` | JWT | All | Reports by school |

### Risk Scores
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/risk-scores/` | JWT | deo, admin | All schools risk scores |
| GET | `/api/risk-scores/all` | JWT | deo, admin, contractor | All risk records |
| GET | `/api/risk-scores/:school_id` | JWT | All | Risk for specific school |

### Maintenance Queue
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/maintenance-queue` | JWT | deo, admin, contractor | Prioritised repair queue |

### Tasks (PS-03)
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/tasks/` | JWT | All | List tasks |
| POST | `/api/tasks/assign` | JWT | deo, admin | Assign task |
| POST | `/api/tasks/complete` | JWT | contractor | Complete task with image |
| PATCH | `/api/tasks/:id/status` | JWT | All | Update task status |

### Work Orders (Legacy)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/work-orders/` | JWT | List work orders |
| POST | `/api/work-orders/assign` | JWT | Assign work order |
| POST | `/api/work-orders/complete` | JWT | Complete with image |
| PATCH | `/api/work-orders/:id/status` | JWT | Update status |

### Alerts
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/alerts/` | JWT | Get alerts for user |
| PATCH | `/api/alerts/:id/read` | JWT | Mark alert as read |

### Analytics
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/` | JWT | District analytics |
| POST | `/api/analytics/update` | JWT | Recompute analytics |

### Maintenance (New Flow)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/maintenance/decisions` | JWT | Create maintenance decision |
| POST | `/api/maintenance/work-orders` | JWT | Create work order from decision |
| POST | `/api/maintenance/repair-logs` | JWT | Log completed repair |

### School Conditions
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/school-conditions/` | None | Create condition record |
| GET | `/api/school-conditions/` | None | List condition records |

### Admin
| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/admin/stats` | JWT | admin | System stats |
| GET | `/api/admin/users` | JWT | admin | List all users |
| DELETE | `/api/admin/users/:id` | JWT | admin | Delete user |
| GET | `/api/admin/load-csv` | JWT | admin | Trigger CSV import |

---

## 8. Configuration & Tooling

### Vite (`frontend/vite.config.js`)
- Plugin: `@vitejs/plugin-react`
- Dev server port: `5173`
- Build output: `dist/`
- Source maps enabled
- JSX handled in `.js` files

### Tailwind CSS (`frontend/tailwind.config.js`)
- Content paths: `index.html`, `src/**/*.{js,jsx}`
- No custom theme extensions documented (uses Tailwind defaults)

### PostCSS (`frontend/postcss.config.js`)
- Plugins: `tailwindcss`, `autoprefixer`

### Rate Limiter (`backend/middleware/rateLimiter.js`)
- Window: 15 minutes
- Max requests: 200 per IP
- Applied to: all `/api` routes

### Multer (`backend/config/multer.js`)
- Storage: disk, `backend/uploads/`
- File filter: image MIME types only
- File size limit: 10 MB

---

## 9. Scripts & Utilities

### `npm run dev` (frontend)
Starts Vite dev server at `http://localhost:5173`

### `npm run build` (frontend)
Builds production bundle to `frontend/dist/`

### `npm run dev` (backend)
Starts Express with nodemon (auto-restart on changes)

### `npm run start` (backend)
Starts Express in production mode (`node server.js`)

### `npm run load-csv` (backend)
Runs `backend/scripts/loadCSV.js` — streams `TS-PS3.csv` into MongoDB

### `node scripts/clearDB.js`
Drops all documents from all collections (use with caution)

### `node scripts/listCollections.js`
Lists all MongoDB collections with document counts; samples `riskpredictions` if present

---

## 10. Environment Variables

### Backend (`.env`)
| Variable | Description |
|---|---|
| `PORT` | Express server port (default: 5000) |
| `NODE_ENV` | `development` / `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRE` | Token expiry duration (e.g., `7d`) |
| `FRONTEND_URL` | Allowed CORS origin URL |

### Frontend (`.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (e.g., `http://localhost:5000/api`) |

---

## 11. Deployment Configuration

### Frontend — Vercel (`frontend/vercel.json`)
- SPA rewrite rule: all routes → `index.html`
- Build output directory: `dist`
- Enables client-side routing to work on Vercel

### Backend
- No Dockerfile or cloud-specific config present
- Designed to be deployed as a standard Node.js app (PM2, Railway, Render, etc.)
- Requires MongoDB Atlas or self-hosted MongoDB instance

---

## 12. Known Issues & Gaps

| Issue | Details |
|---|---|
| **`seed.js` broken** | Imports `./models/School.js`, `ConditionReport.js`, `WorkOrder.js` — these paths don't match current model filenames (`school.model.js`, etc.) — `node seed.js` would fail |
| **`/api/school-conditions` unprotected** | Router has no `protect` middleware — any unauthenticated request can create/list school condition records |
| **Dual work order APIs** | Both `/api/tasks` and `/api/work-orders` exist as aliases — frontend uses the legacy one; could be consolidated |
| **README outdated** | References old folder structure (`ConditionReport.js`, old seed flow) — doesn't reflect current model file names |
| **No dedicated `hooks/` folder** | Custom hooks beyond `useAuth` (from context) are not present |
| **No test suite** | No unit or integration tests found (no Jest/Vitest config) |
| **No linting config** | No ESLint/Prettier config files found in the repository |
| **`priorityConfig` model unused** | Model exists with tunable weights but no controller/route reads or writes it at runtime |
