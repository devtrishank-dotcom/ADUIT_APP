# AMS Demo Guide

## Login Accounts

| Role | Employee Code | Password |
|---|---|---|
| System Administrator | EMP001 | admin123 |
| HIA | EMP002 | hia123 |
| Audit Planner | EMP003 | planner123 |
| Auditor | EMP004 | auditor123 |
| Branch Manager | EMP005 | bm123 |
| Compliance Owner | EMP006 | comp123 |

## Demo Data

The demo seed creates data without deleting existing records:

- 5 branches and 10 PACS societies
- 2 financial/audit plans and 5 plan items
- 4 audit instances: submitted, approved, closed, and in-progress
- 4 observations with open, partially complied, and verified statuses
- Compliance response and verification history
- 1 audit ready for closure and 1 closure certificate
- 2 value statements and 2 risk configurations
- 3 notification templates and admin notifications
- Workflow history and activity log entries

Run it again safely with:

```powershell
cd backend
npm run seed:demo
```

## Main Workflow

1. Login as `EMP001` to see every module.
2. Open `Admin > Masters` to manage branches, PACS, financial years, and audit types.
3. Open `Admin > Templates` to create a template, select Branch Audit or PACS Audit, add sections and fields, save, and publish.
4. Open `Planning` and select a plan. Use `Auto-Generate Plan` for branch/PACS plan items, or use `New Plan` and `Add Item` for manual planning.
5. Use `Start` on a planned item. This creates an audit instance and opens it for the assigned auditor or branch manager.
6. Open `My Audits` to fill the dynamic checklist, save responses, add evidence, create observations, and submit for review.
7. Login as `EMP002` and open `HIA Review` to approve, return, or escalate submitted audits.
8. Login as `EMP006` and open `Compliance` to respond to open observations with rectification details.
9. Login as `EMP002` and verify compliance from the observation detail screen.
10. Open `Closure` when all observations are verified or accepted, then generate the closure certificate.
11. Open `Reports` for plan status, observations, risk trend, compliance ageing, and HIA dashboard data.

## Configuration Order For A New Audit Type

1. Create the audit type in `Admin > Masters > Audit Types`.
2. Create the template in `Admin > Templates`.
3. Add sections and fields in the Template Builder.
4. Configure option lists, value statements, and risk bands.
5. Publish the template.
6. Configure the workflow in `Admin > Workflows`.
7. Add the audit type to a plan and start an audit.
