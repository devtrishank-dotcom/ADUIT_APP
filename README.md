# AUDIT_APP - Audit Management System (AMS)

DCCB mate bane de Audit Management System: Branch Audit ane PACS/Mandali Audit ni sampoorna digital platform.

## Modules

- Dynamic Template Builder (no-code audit formats)
- Audit Planning (annual calendar, auto-generate)
- Auditor Execution (dynamic form fill, risk scoring, evidence upload)
- Compliance Tracking (observations, rectification, ageing)
- HIA Review (approvals, overrides, dashboards)
- Audit Closure (closure certificates)
- Reports & MIS (plan vs actual, risk trend, ageing, exports)
- Dynamic RBAC, Workflow Engine, Notifications

## Tech Stack

- Frontend: React 18 + Ant Design 5 + Recharts
- Backend: Node.js + Express + MongoDB (Mongoose)
- Deployment: Render (render.yaml included)

## Local Run

```powershell
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm start
```

## Seed Data

```powershell
cd backend
npm run seed        # fresh base data (roles, users, templates, workflows)
npm run seed:demo   # demo plans, audits, observations, notifications
npm run seed:gst    # GST/CGST/SGST fields migration
```

## Demo Logins

| Role | Employee Code | Password |
|---|---|---|
| Admin | EMP001 | admin123 |
| HIA | EMP002 | hia123 |
| Planner | EMP003 | planner123 |
| Auditor | EMP004 | auditor123 |
| Branch Manager | EMP005 | bm123 |
| Compliance | EMP006 | comp123 |
