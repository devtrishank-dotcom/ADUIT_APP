# Audit Management System (AMS) — Flow Presentation

**DCCB — District Central Co-operative Bank**
Digital platform for **Branch Audit** & **PACS/Mandali Audit**
*Planning → Execution → Compliance → Review → Closure*

---

## 1. Overview

AMS digitises the Bank's entire internal inspection lifecycle and replaces paper registers, fixed printed questions and manual follow-up with a single configurable platform.

| Audit Type | Description |
|---|---|
| **Branch Audit** | Internal inspection of the Bank's own branches — Accounts & Loan departments, registers, staff conduct, HO circular compliance and profitability. |
| **PACS / Mandali Audit** | Inspection of Primary Agricultural Co-operative Societies by the linked Branch Manager — membership, share capital, loans, committee, registers and financial soundness. |

> **Core idea:** Branch Audit and PACS Audit are not separate modules in code — they are two configurations of one metadata-driven audit engine. New audit types (IS Audit, Concurrent Audit, Statutory Audit tracking) can be added later without code changes.

---

## 2. User Roles

| Role | Responsibility in AMS |
|---|---|
| **System Administrator** | Configures templates, dropdowns, risk scoring, value statements, workflows, roles/permissions and masters. |
| **Head of Internal Audit (HIA)** | Approves the annual plan, reviews submitted audits, overrides risk ratings with justification, approves closure, views bank-wide dashboards. |
| **Audit Planner** | Builds the annual audit calendar, assigns auditors, tracks plan vs. actual. |
| **Auditor** | Executes the Branch Audit checklist at assigned branches and submits for review. |
| **Branch Manager** | Executes PACS/Mandali audits for societies linked to the branch. |
| **Compliance Owner** | Responds to observations with rectification evidence and tracks outstanding paras. |
| **Board / Management** | Read-only consolidated dashboards, closure certificates and MIS. |

---

## 3. End-to-End Lifecycle

### Stage 1 — Planning (Audit Planner → HIA)
- Create the annual plan for the financial year (one plan per FY).
- Auto-generate line items for every active branch and PACS, or add items manually.
- Assign auditor / branch manager, period and planned dates; risk-based priority.
- Submit the plan for approval → HIA approves.

### Stage 2 — Audit Execution (Auditor / Branch Manager)
- Start an audit from the plan — a checklist is generated from the published template.
- Fill section-by-section (text, dropdown, Yes/No, grids, registers checklist) with guidance shown inline.
- Attach evidence (photos / scans) and see live risk scoring.
- Raise observations for non-compliance (auto-detected or manual).
- Digitally sign and submit for review.

### Stage 3 — Compliance Tracking (Compliance Owner ↔ Auditor / HIA)
- Compliance owner sees all open observations with severity, target date and ageing.
- Submits rectification with evidence — marks **Fully Complied** or **Partially Complied**.
- Auditor / HIA verifies: **Approve → Verified**, **Reject → back to Open**, or **Accept Risk**.

### Stage 4 — HIA Review (Head of Internal Audit)
- Review inbox of submitted audits with computed risk rating and key observations.
- Approve, Return for rework, Escalate, or Override the risk rating with mandatory justification.
- Bank-wide portfolio heat-map, plan vs. actual, ageing and productivity dashboards.

### Stage 5 — Audit Closure (HIA)
- Once the audit is approved and all observations are Verified / Accepted Risk, it becomes closure-ready.
- Generate a system-numbered **Closure Certificate** (PDF) with digital sign-off and timestamps.
- Closed audits are locked; corrections go through a permissioned, logged Reopen.

---

## 4. Modules

| Module | Purpose |
|---|---|
| **Master Data** | Branches, PACS, users, financial years, audit types, calendars. |
| **Template Builder** | No-code designer for sections, fields, dropdowns, grids and registers checklists. |
| **Audit Planning** | Annual calendar, auto-generate, assignments, plan vs. actual tracking. |
| **Audit Execution** | Dynamic form fill, offline-capable, evidence upload, live risk score. |
| **Compliance** | Observation worklist, rectification thread, ageing and escalation. |
| **HIA Review** | Approvals, returns, risk override, portfolio dashboards. |
| **Audit Closure** | Closure certificates, locked archive, controlled reopen. |
| **Notifications** | In-app / email / SMS alerts for assignments, due dates and actions. |
| **Reports & MIS** | Plan vs. actual, observation register, risk trend, ageing, exports. |

---

## 5. The Three Engines — Configuration over Code

### Template Engine
Sections, sub-sections, 15 field types, dropdown option lists, risk weights & scoring bands, bilingual value statements, repeatable grids — all data-driven. Templates are versioned so historical audits re-render exactly as answered.

### Workflow Engine
One state machine for plan approval, audit review and per-observation verification. Stages define actor, allowed actions, SLA, reminders, escalation and conditional routing (e.g. high-risk needs extra sign-off).

### RBAC Engine
Roles × granular permissions × data scope (All / Zone / Branch / PACS / Own). Enforced at the API layer, not just the UI. New roles and field-level restrictions are created in minutes.

> **Result:** adding a new question, changing a dropdown, inserting a review stage or creating a brand-new audit type is a configuration exercise, not a development project.

---

## 6. Observation & Compliance Lifecycle

| Stage | Actor | What happens | Status |
|---|---|---|---|
| 1. Raise | Auditor | Non-compliant answer promoted to an observation with severity & target date | `Open` |
| 2. Respond | Compliance Owner | Rectification description + evidence submitted | `Partially Complied` / `Complied` |
| 3. Verify | Auditor / HIA | Approve the response, reject it (back to owner), or accept the risk | `Verified` / `Open` / `Accepted Risk` |
| 4. Close | HIA | When all observations are resolved, the audit is closure-ready | `Closed` |

**Ageing & escalation** — Overdue observations are colour-coded by ageing and auto-escalated per SLA, appearing on the HIA escalation dashboard.
**Recurrence tracking** — An observation that also appeared in the entity's previous audit is flagged for HIA attention.

---

## 7. Security & Auditability

- Role-based authentication with strong password policy; optional MFA/OTP for sensitive actions.
- Server-side enforcement of RBAC and data scope on every API call.
- Immutable activity log of every create / update / approve / override / configuration change.
- Versioned templates — a closed audit always re-renders with the rules in force when answered.
- Segregation of duties — the executor cannot approve their own audit.
- Encryption in transit; soft-deletes only, with full history retained.

---

## 8. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Ant Design 5, Recharts — responsive console + tablet-friendly field app, bilingual UI |
| Backend | Node.js + Express REST API, modular by domain |
| Database | MongoDB (Mongoose), hosted on MongoDB Atlas |
| Deployment | Render web service serving API + production React build from one URL; auto-deploy on push |

---

## 9. Demo Logins

| Role | Employee Code | Password |
|---|---|---|
| System Administrator | `EMP001` | `admin123` |
| Head of Internal Audit (HIA) | `EMP002` | `hia123` |
| Audit Planner | `EMP003` | `planner123` |
| Auditor | `EMP004` | `auditor123` |
| Branch Manager | `EMP005` | `bm123` |
| Compliance Owner | `EMP006` | `comp123` |

**Branch-level users** (one set per branch): **Auditor** `AUD001`… (`auditor123`) · **Branch Manager** `BM001`… (`bm123`) · **Compliance Owner** `CO001`… (`comp123`). All are one-click logins on the login screen.

**Suggested demo path:** Planner creates & submits a plan → HIA approves → Auditor fills an audit & raises observations → Compliance responds → HIA verifies → Closure certificate generated.

---

*Audit Management System (AMS) — Flow Presentation · Prepared for DCCB · Confidential*
