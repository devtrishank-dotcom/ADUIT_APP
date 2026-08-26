# GitHub and Render Deployment

## GitHub

Create an empty GitHub repository for AMS and use its HTTPS or SSH URL. Do not commit `backend/.env`, database credentials, or JWT secrets.

## Render Blueprint

This repository contains `render.yaml` for one Render web service. The backend serves the production React build, so the app and `/api/v1` use the same URL.

Set this required Render environment variable:

- `MONGODB_URI`: MongoDB Atlas connection string

`JWT_SECRET` is generated automatically by Render.

## First-Time Demo Seed

After the first deploy, open the Render Shell and run these commands once:

```bash
cd backend
SEED_DROP_DATA=true npm run seed
npm run seed:demo
```

The first command loads masters, roles, users, workflows, and templates. The second command loads the demo plans, audits, observations, compliance history, closure certificate, reports, and notifications.

## Production Notes

- The free Render service may sleep when idle.
- Local uploads under `/tmp/ams-uploads` are not persistent across redeploys. Use object storage for permanent evidence files.
- Login after deploy with `EMP001` and the seeded password `admin123`, then change the password in a production environment.
