# Saksham — Remaining Tasks & Issue Roadmap

> **Last Updated:** April 18, 2026
> **PS Reference:** TS-03 — Predictive Maintenance Engine for School Infrastructure

This document tracks pending features, technical debt, and identified bugs for the next phase of development. Items are organized by priority tier.

---

## 🔴 Priority 1 — PS Compliance (Critical for Demo/Judging)

### 1. Dedicated Principal Dashboard

**Why critical:** PS explicitly defines `School Principal` as a separate role — "Views school condition summary; approves urgent repair requests." Currently, principal renders the same `SchoolView` as peon.

**Required implementation:**
- Route `/dashboard` for `principal` role should render a `PrincipalDashboard.jsx` component
- School-level overview showing all weekly reports across all 3 categories in a timeline/trend view
- Trend analysis: chart showing condition score over the last N weeks per category (line chart using recharts or a canvas library)
- "Approve urgent repair request" CTA — connects to `MaintenanceDecision` status flow (principal can set status from `pending` to `approved`)
- Direct communication link with assigned contractor (can be a simple mailto or message field stored on WorkOrder)
- Stats panel: total reports submitted this month, worst category, days since last report

**Files to create/modify:**
- Create `frontend/src/pages/PrincipalDashboard.jsx`
- Modify `frontend/src/App.jsx` → `DashboardIndex` to route `principal` role to `PrincipalDashboard`
- Modify `frontend/src/components/AppLayout.jsx` → add principal-specific nav items
- Backend: May need `GET /api/risk/:schoolId` to return trend data (already returns `weeksOfData` and `deterioration_rate`)

---

### 2. Real-time GPS Mismatch Alerts — DEO UI

**Why critical:** PS specifies contractor submits "photo + GPS completion confirmation" — GPS mismatch detection is implemented in backend but completely invisible to DEOs in the frontend.

**Required implementation:**
- Add a "🚩 Flagged" tab in `DEODashboard.jsx` alongside the queue table — shows work orders where `locationMismatch = true`
- Flagged work order card should show: school name, contractor name, submitted coordinates vs school coordinates, distance delta
- Add a `GET /api/tasks?locationMismatch=true` filter support in `workorder.controller.js`
- Visual alert badge on the DEO dashboard header if any mismatch work orders exist (count badge)
- Push/in-app notification: when contractor submits a mismatched completion, create an `Alert` record of a new type `GPS_MISMATCH` and surface it in the alerts panel

**Files to create/modify:**
- Modify `frontend/src/pages/DEODashboard.jsx` — add Flagged tab
- Modify `backend/controllers/workorder.controller.js` — add `?locationMismatch=true` filter
- Modify `backend/controllers/workorder.controller.js` — `completeTask()` should create `Alert` of type `GPS_MISMATCH` when mismatch detected
- Modify `backend/models/alert.model.js` — add `GPS_MISMATCH` to type enum

---

### 3. SLA Breach Analytics in DEO Dashboard

**Why critical:** PS mentions DEO "tracks SLA." Backend has `slaBreached` flag and `contractorDelayDays` but these are not surfaced in the DEO UI beyond the `SLAMetricCard` in `WorkOrders.jsx` which only shows a count.

**Required implementation:**
- A contractor performance section in DEO dashboard or a separate "Analytics" tab: average delay days per contractor, SLA breach rate per contractor
- Uses existing `GET /api/analytics/model-accuracy` and district analytics data
- Bar chart or table: Contractor Name | Assigned Orders | Completed On-Time | SLA Breaches | Avg Delay Days
- Query: aggregate `RepairLog` by contractor (via `WorkOrder.assignment.assignedTo` join)

**Files to create/modify:**
- Modify `frontend/src/pages/DEODashboard.jsx` — add analytics section or tab
- Add backend endpoint: `GET /api/analytics/contractor-sla` — aggregates `WorkOrder` + `RepairLog` by contractor

---

## 🟠 Priority 2 — Feature Completeness

### 4. Analytics Expansion — Failure Date Prominence in DEO Queue

**Current state:** `within_30_days` and `within_60_days` are present in queue data but the DEO dashboard table doesn't prominently call these out. Days to failure column exists but failure window badges are missing.

**Required implementation:**
- Add `⚠ FAILS <30D` and `📅 FAILS <60D` badges in the Days to Failure column of DEO queue table
- Color-code: red pulsing badge for <30d, amber for <60d, blue otherwise
- Already available in data: `s.within_30_days`, `s.within_60_days` from `/api/risk/queue` response

**Files to modify:**
- `frontend/src/pages/DEODashboard.jsx` — update Days to Failure cell rendering

---

### 5. Prediction Failure Date on School View

**Current state:** `SchoolView.jsx` shows `timeToFailureDays` but doesn't compute or show the calendar date of predicted failure.

**Required implementation:**
- Show "Predicted failure: ~June 15, 2026" by computing `new Date() + timeToFailureDays`
- Per-category breakdown should show individual predicted failure dates
- Already available in data: `estimated_days_to_failure` per category from `/api/risk/:schoolId`

**Files to modify:**
- `frontend/src/pages/SchoolView.jsx`

---

### 6. Model Accuracy Dashboard UI

**Current state:** `GET /api/analytics/model-accuracy` endpoint exists and returns structured data but there is no frontend UI that displays this.

**Required implementation:**
- Admin/DEO-accessible page or panel showing:
  - Overall mean absolute error
  - Per-category accuracy breakdown (overestimated/accurate/underestimated counts + percentages)
  - Per-district accuracy
  - Sample size (total repairs)
- This directly demonstrates PS requirement #8: "System learns from completed repairs"

**Files to create/modify:**
- Create `frontend/src/pages/ModelAccuracy.jsx` or add section to admin view
- Add route `/dashboard/model-accuracy` for deo/admin roles
- Modify `AppLayout.jsx` to add nav link for admin/deo

---

### 7. Increase GPS Timeout + Add Retry in CompletionModal

**Current state:** `CompletionModal.jsx` uses `timeout: 5000` (5s) for geolocation — too short for mobile networks. No retry button when GPS fails.

**Required implementation:**
- Increase timeout to `10000` (10s)
- Add `maximumAge: 30000` to allow cached position
- Add "🔄 Retry GPS" button shown when `gpsStatus === 'denied'`
- On retry: call `getCurrentPosition` again and update state

**Files to modify:**
- `frontend/src/components/CompletionModal.jsx`

---

## 🟡 Priority 3 — Maintenance & Technical Debt

### 8. Fix `backend/seed.js`

**Problem:** `seed.js` uses outdated import paths and old model names that don't match current file structure. Running `node seed.js` fails with `ERR_MODULE_NOT_FOUND`.

**Required fix:**
- Replace `import School from './models/school.model.js'` (check and verify path)
- Replace `import ConditionReport from './models/conditionReport.model.js'`
- Replace `import WorkOrder from './models/work-order.model.js'`
- Update user roles from old `'school'` to `'peon'` and `'principal'` per new enum
- Update seeded data to use `SchoolConditionRecord` instead of `ConditionReport` format

**Files to modify:**
- `backend/seed.js`

---

### 9. Fix `backend/scripts/verify_gps.js`

**Problem:** Import path is `./backend/models/index.js` instead of `../models/index.js`. Script is meant to be run from `backend/scripts/` directory.

**Required fix:**
- Change line 1: `import { WorkOrder, School, RepairLog } from './backend/models/index.js'`
  → `import { WorkOrder, School, RepairLog } from '../models/index.js'`
- Change line 2: `import { completeTask } from './backend/controllers/workorder.controller.js'`
  → `import { completeTask } from '../controllers/workorder.controller.js'`
- Uncomment the `testGpsValidation()` call at the bottom or add a CLI entry point
- Add `dotenv/config` import to load `MONGODB_URI`

**Files to modify:**
- `backend/scripts/verify_gps.js`

---

### 10. API Consolidation — Retire `/api/work-orders` Alias

**Problem:** Both `/api/tasks` and `/api/work-orders` are mounted in `server.js` pointing to the same router. This is technical debt causing frontend confusion and double route registration.

**Required fix:**
- Update `WorkOrders.jsx` frontend to use `/api/tasks` exclusively
- Update `CompletionModal.jsx` to use `/api/tasks/complete` (already done — verify)
- Remove the `app.use('/api/work-orders', taskRoutes)` line from `server.js`
- Remove `backend/routes/workorder.routes.js` (legacy file)
- Update API Reference in `README.md`

**Files to modify:**
- `backend/server.js`
- `frontend/src/pages/WorkOrders.jsx` — verify API calls use `/api/tasks`
- `frontend/src/components/CompletionModal.jsx` — verify

---

### 11. Security Hardening — Input Validation

**Problem:** No `express-validator` on critical write endpoints. Malformed inputs could cause Mongoose cast errors or unexpected behavior.

**Required fix — `report.controller.js` `submitReport()`:**
- Validate `weekNumber` is integer 1–53
- Validate `buildingAge` is non-negative number
- Validate `numStudents` is non-negative number
- Validate `toiletFunctionalRatio` is 0–1
- Validate `powerOutageHours` is 0–168

**Required fix — `workorder.controller.js` `completeTask()`:**
- Validate `workOrderId` is valid MongoDB ObjectId
- Validate `afterConditionScore` is integer 1–5
- Validate `beforeConditionScore` is integer 1–5
- Validate `lat` is -90 to 90 if provided
- Validate `lng` is -180 to 180 if provided

**Files to modify:**
- `backend/controllers/report.controller.js`
- `backend/controllers/workorder.controller.js`
- `backend/package.json` — add `express-validator`

---

### 12. Update README.md Architecture Section

**Problem:** README references old folder structure and old role names that no longer match the codebase.

**Required updates:**
- **Folder Structure section:** Update model filenames to `user.model.js`, `school.model.js`, `school-condition-record.model.js`, etc.
- **Role names:** Change `school` → `peon` and add `principal` role throughout
- **Demo accounts table:** Add `principal@demo.com / password123` row
- **Architecture section:** Update to reflect 2026 structure — 8 collections, separate `routes/task.routes.js`
- **API Reference table:** Add new endpoints (`/api/risk/queue`, `/api/analytics/model-accuracy`, `/api/admin/priority-config`, etc.)
- **Role-Based Access table:** Add `principal` row

**Files to modify:**
- `README.md`

---

## 🟢 Priority 4 — Enhancements (Post-Hackathon)

### 13. Real-time Notifications (WebSocket or SSE)

**Description:** When a contractor submits a GPS-mismatched completion, the DEO should see a live alert without refreshing. Currently alerts require manual refresh.

**Implementation approach:**
- Add Socket.IO or Server-Sent Events to backend
- Emit `gps_mismatch_alert` event on `completeTask()` when `locationMismatch = true`
- DEO dashboard subscribes and shows a toast notification

---

### 14. Photo Upload in CompletionModal

**Current state:** `CompletionModal.jsx` uses a hardcoded Unsplash URL as photo placeholder. Actual file upload is not wired.

**Required implementation:**
- Add `<input type="file" accept="image/*" capture="environment">` for mobile camera
- Use `postFile()` from `api.js` to upload to `/api/tasks/complete` as multipart
- Show image preview before submission

**Files to modify:**
- `frontend/src/components/CompletionModal.jsx`

---

### 15. Photo Upload in WeeklyInputForm

**Current state:** The form has `upload.array('images', 5)` multer middleware on the backend route but `WeeklyInputForm.jsx` submits JSON via `post()`, not `postFile()`. Images are never actually sent.

**Required implementation:**
- Change form submission to use `FormData` and `postFile()`
- Add `<input type="file" multiple accept="image/*">` to the form
- Show image thumbnails after selection

**Files to modify:**
- `frontend/src/pages/WeeklyInputForm.jsx`

---

### 16. Contractor Assignment in DEO Work Orders

**Current state:** `NewWorkOrderPanel` in `WorkOrders.jsx` loads contractor list via `GET /api/admin/users`. DEO role has access to this endpoint (admin.routes.js allows `authorize('admin', 'deo')`), but this is a fragile dependency on the admin endpoint.

**Required fix:**
- Create dedicated `GET /api/users?role=contractor` endpoint in a users route (or expose contractor list via `/api/schools` adjacent endpoint)
- Decouple contractor listing from admin endpoint

---

### 17. Pagination for Large Datasets

**Current state:** DEO queue and all-risk endpoints return all matching documents (could be thousands from the CSV load). No pagination.

**Required implementation:**
- Add `page` and `limit` query params to `/api/risk/queue`, `/api/risk/all`, `/api/reports`
- Add pagination controls (prev/next, page numbers) in DEO Dashboard table and SchoolView records list

---

## 🐞 Bug Tracker

| Issue ID | Component | Problem | Suggested Fix | Status |
|---|---|---|---|---|
| **BUG-01** | Backend | `seed.js` fails with `ERR_MODULE_NOT_FOUND` — wrong model import paths | Update import paths in `seed.js` | Open |
| **BUG-02** | Backend | `verify_gps.js` has wrong import path `./backend/models/index.js` | Change to `../models/index.js` | Open |
| **BUG-03** | Frontend | GPS capture timeout is 5s — too short for mobile | Increase to 10s, add Retry button in `CompletionModal.jsx` | Open |
| **BUG-04** | Frontend | `WeeklyInputForm.jsx` submits JSON but backend expects multipart for images — photos never upload | Switch to `FormData` + `postFile()` | Open |
| **BUG-05** | Backend | `NewWorkOrderPanel` uses `/api/admin/users` to load contractors — breaks if DEO doesn't have admin-level access in future | Create dedicated contractor listing endpoint | Open |
| **BUG-06** | Backend | `WorkOrders.jsx` still calls `/api/work-orders` (legacy alias) instead of canonical `/api/tasks` | Update frontend to use `/api/tasks` | Open |
| **BUG-07** | Backend | `conditionReport.model.js` exists as a legacy model alongside `school-condition-record.model.js` — dead code causes confusion | Remove or clearly deprecate `conditionReport.model.js` | Open |

---

## 📝 Fix Log
*When fixing an issue from the list above, please denote it here with the fix details.*

- [ ] **BUG-01** (seed.js import paths): [Description of fix]
- [ ] **BUG-02** (verify_gps.js import path): [Description of fix]
- [ ] **BUG-03** (GPS timeout): [Description of fix]
- [ ] **BUG-04** (photo upload): [Description of fix]
- [ ] **BUG-05** (contractor listing): [Description of fix]
- [ ] **BUG-06** (legacy API path): [Description of fix]
- [ ] **BUG-07** (dead model file): [Description of fix]

---

## ✅ Completed Features (PS-03 Requirements)

| Requirement | Implementation | File |
|---|---|---|
| Structured weekly condition form (< 2 min, dropdown-based) | ✅ Done | `WeeklyInputForm.jsx` |
| Category-specific failure prediction (plumbing/electrical/structural) | ✅ Done | `predictionEngine.js` |
| Failure prediction with cited evidence (not black-box) | ✅ Done | `evidence[]` array in engine |
| Student impact prioritisation (girls' school plumbing ×1.5) | ✅ Done | `predictRiskForCategory()` |
| 30–60 day predictive horizon per category | ✅ Done | `within_30_days`, `within_60_days` |
| DEO district-level maintenance queue (not per-school alert flood) | ✅ Done | `/api/risk/queue` |
| Contractor work order + GPS + photo completion workflow | ✅ Done | `completeTask()`, `CompletionModal.jsx` |
| Model learns from completed repairs (prediction error tracking) | ✅ Done | `RepairLog.predictionError`, `/api/analytics/model-accuracy` |
| Building age deterioration multiplier | ✅ Done | `ageFactorForRisk()` in engine |
| Weather zone multiplier | ✅ Done | `WEATHER_FACTORS` in engine |
| Deterioration rate via linear regression | ✅ Done | `deteriorationSlope()` |
| SLA tracking and breach detection | ✅ Done | `slaBreached` flag + `WorkOrder.deadline` |
| GPS mismatch detection (Haversine) | ✅ Done | `getDistanceKM()` in `completeTask()` |
| Dynamic priority config (admin-tunable weights) | ✅ Done | `PriorityConfig` model + `/api/admin/priority-config` |
| CSV bulk import pipeline (50,000 rows) | ✅ Done | `loadCSV.js` |
| Role-based access (5 roles: peon/principal/deo/contractor/admin) | ✅ Done | JWT middleware |
| Alert digest per district+category | ✅ Done | `/api/alerts/digest` |
