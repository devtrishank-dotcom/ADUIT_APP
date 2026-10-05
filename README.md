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
- Backend (original): Node.js + Express + MongoDB (Mongoose) — kept in `backend/`
- Backend (.NET): ASP.NET Core 10 Web API + Dapper + MySQL — new, in `AuditApp.Api/`
- Deployment: Render (render.yaml included)

## .NET API + MySQL (converted backend)

The Node/MongoDB backend has been ported to ASP.NET Core 10 + Dapper + MySQL while
keeping the exact same REST contract, so the React frontend runs unchanged (CRA proxy
points to `http://localhost:5000`).

```powershell
# 1. Start MySQL (any of these)
docker compose up -d          # uses docker-compose.yml (root)
#   or point ConnectionStrings:MySql in AuditApp.Api/appsettings.json at your server

# 2. Run the API (auto-creates the schema + seeds base data on first run)
cd AuditApp.Api
dotnet run
```

- Schema: `AuditApp.Api/Data/Schema.sql` (relational tables + JSON columns for nested arrays)
- Seed: `AuditApp.Api/Seeds/SeedService.cs` (ported from `backend/seeds/seed-runner.js`)
- Config: `AuditApp.Api/appsettings.json` (`ConnectionStrings:MySql`, `Jwt`, `Database:AutoCreate`, `Database:AutoSeed`)
- Swagger UI: `http://localhost:5000/swagger`

## Local Run (original Node backend)

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
