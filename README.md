# Saksham — Predictive Maintenance Engine for School Infrastructure (PS-03)

A hackathon-ready full-stack prototype for predictive school infrastructure maintenance.  
**Saksham** (सक्षम — meaning "capable/empowered") enables data-driven maintenance decisions for government schools.

---

## Problem Statement

Schools across India suffer from deteriorating infrastructure — leaking roofs, faulty wiring, broken sanitation — due to reactive (not predictive) maintenance. This system uses weekly condition reports + rule-based AI to predict failures **before** they happen and prioritise repairs by risk.

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend

```bash
cd backend
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET
npm install
npm run dev            # runs on port 5000
```

### Seed Demo Data

```bash
cd backend
node seed.js
```

**Demo accounts** (password: `password123`):
| Role | Email |
|------|-------|
| DEO | deo@demo.com |
| Contractor | contractor1@demo.com |
| School Admin | school1@demo.com |
| Admin | admin@demo.com |

### Frontend

```bash
cd frontend
npm install
npm run dev            # runs on port 5173
```

---

## Architecture

```
Weekly Input → Prediction Engine → Priority Engine → Queue → Work Orders
```

### Folder Structure

```
backend/
├── models/
│   ├── user.model.js        # Roles: school | deo | contractor | admin
│   ├── School.js            # School entity with cached risk scores
│   ├── ConditionReport.js   # Weekly inspection reports
│   └── WorkOrder.js         # Maintenance task lifecycle
├── services/
│   └── predictionEngine.js  # CORE: rule-based deterioration scoring
├── controllers/
│   ├── report.controller.js
│   ├── risk.controller.js
│   └── workorder.controller.js
├── routes/                  # RESTful API endpoints
└── seed.js                  # Demo data generator

frontend/src/
├── pages/
│   ├── Login.jsx            # Role-aware login with demo fill buttons
│   ├── SchoolView.jsx       # School admin: status + report history
│   ├── DEODashboard.jsx     # DEO: prioritised risk table across all schools
│   ├── WeeklyInputForm.jsx  # Condition input form (dropdown-based)
│   └── WorkOrders.jsx       # Work order CRUD for DEO + contractor
├── components/
│   └── AppLayout.jsx        # Role-based navigation sidebar
└── context/AuthContext.jsx  # JWT cookie auth
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT cookie |
| GET | `/api/auth/me` | Current user |
| GET | `/api/schools` | List all schools |
| POST | `/api/condition-report` | Submit weekly report |
| GET | `/api/condition-report` | Get reports (filtered) |
| GET | `/api/risk-scores` | Aggregated risk scores (DEO) |
| GET | `/api/risk-scores/:schoolId` | Per-school risk analysis |
| GET | `/api/risk-scores/queue/maintenance` | Prioritised queue |
| GET | `/api/work-orders` | List work orders |
| POST | `/api/work-orders/assign` | Create & assign work order |
| POST | `/api/work-orders/complete` | Mark task complete |

---

## Prediction Engine Logic

**File:** `backend/services/predictionEngine.js`

### Scoring Formula

```
condition_score = Σ (condition_weight × category_weight) / Σ category_weight
composite = condition_score × building_age_multiplier × time_decay_weight
```

| Condition | Points |
|-----------|--------|
| Good | 1 |
| Moderate | 2 |
| Poor | 3 |

| Category | Weight | Rationale |
|----------|--------|-----------|
| Structural | 1.00 | Collapse risk |
| Electrical | 0.85 | Fire / shock |
| Sanitation | 0.80 | Health / compliance |
| Plumbing | 0.65 | Water supply |
| Furniture | 0.35 | Low safety impact |

| Building Age | Multiplier |
|-------------|-----------|
| < 5 years | ×0.80 |
| 5–10 | ×0.90 |
| 10–20 | ×1.00 |
| 20–30 | ×1.10 |
| 30–40 | ×1.20 |
| 40+ | ×1.35 |

### Risk Levels

| Score | Level | Time to Failure |
|-------|-------|-----------------|
| 76–100 | Critical | 0–15 days |
| 51–75 | High | 16–30 days |
| 26–50 | Moderate | 31–60 days |
| 0–25 | Low | 61–120 days |

### Priority Queue Formula

```
priority = riskScore × 0.6 + trendBonus + studentImpactBonus
```

- `trendBonus` = +15 if deteriorating trend
- `studentImpactBonus` = up to +20 based on student count

---

## Role-Based Access

| Feature | School | DEO | Contractor | Admin |
|---------|--------|-----|-----------|-------|
| Submit weekly report | ✓ | ✓ | — | ✓ |
| View own school risk | ✓ | ✓ | — | ✓ |
| View all school risks | — | ✓ | — | ✓ |
| Create work orders | — | ✓ | — | ✓ |
| View assigned tasks | — | ✓ | ✓ | ✓ |
| Complete tasks | — | ✓ | ✓ | ✓ |

---

## Demo Flow

1. **Login as DEO** → see prioritised risk table of all 5 schools
2. Click **Assign** on a critical school → create work order
3. **Login as Contractor** → see assigned tasks, mark complete
4. **Login as School Admin** → view risk gauge + submit weekly report
5. Recheck DEO dashboard — scores update in real-time

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Tailwind CSS v3, React Router v6 |
| Backend | Node.js, Express 4, Mongoose |
| Database | MongoDB Atlas |
| Auth | JWT (HttpOnly cookie) |
| Prediction | Pure rule-based JS (no ML dependencies) |
