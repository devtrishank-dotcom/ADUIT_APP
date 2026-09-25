# AMS User Guide

**Audit Management System — step-by-step guide for every role and module**
DCCB · Branch Audit & PACS/Mandali Audit

---

## Contents
1. [Getting Started](#1-getting-started)
2. [Administrator Guide](#2-administrator-guide)
3. [Audit Planner Guide](#3-audit-planner-guide)
4. [Auditor / Branch Manager Guide](#4-auditor--branch-manager-guide)
5. [Compliance Owner Guide](#5-compliance-owner-guide)
6. [HIA Review Guide](#6-hia-review-guide)
7. [Audit Closure Guide](#7-audit-closure-guide)
8. [Reports & MIS](#8-reports--mis)
9. [Troubleshooting / FAQ](#9-troubleshooting--faq)

---

## 1. Getting Started

1. **Log in** with your Employee Code and password.
2. **Switch language** using the globe icon in the header — the UI supports **Gujarati / English**.
3. **Dashboard** shows your role-specific widgets; the left menu only shows modules your role can access.
4. **Notifications** (bell icon) show assignments, due dates and approvals. Click an item to jump to it.

### Demo logins

| Role | Employee Code | Password |
|---|---|---|
| System Administrator | `EMP001` | `admin123` |
| HIA | `EMP002` | `hia123` |
| Audit Planner | `EMP003` | `planner123` |
| Auditor | `EMP004` | `auditor123` |
| Branch Manager | `EMP005` | `bm123` |
| Compliance Owner | `EMP006` | `comp123` |

---

## 2. Administrator Guide

### 2.1 Master Data
Menu: **Admin → Masters**. Manage Branches, PACS, Financial Years and Audit Types. Keep statuses accurate — planning and auto-generate use only active records.

### 2.2 Template Builder (no-code audit formats)
1. **Admin → Templates → New Template**, pick the Audit Type, save.
2. Open the **Template Builder**. Add **sections** and **fields** (text, number, currency, %, date, dropdown, Yes/No, grid, file, signature…).
3. For dropdowns, bind a shared **Option List** (e.g. Compliance Status: Complied / Partially Complied / Not Complied / Not Applicable).
4. Mark fields **Mandatory**, add **visibility rules**, and attach bilingual **Value Statements**.
5. Set **Risk Scoring**: field weight + points per option + scoring bands.
6. Use **Registers Checklist** grids for the Accounts / Loan / PACS register lists.
7. Click **Publish**. New audits use the new version; in-progress/closed audits keep their old version.

### 2.3 Option Lists, Value Statements & Risk Config
Edit shared dropdowns, bilingual guidance statements and risk bands under their respective Admin menu items. Changes apply to new template versions.

### 2.4 Workflows
**Admin → Workflows**. Add / reorder stages, set the actor role, allowed actions, SLA and conditional routing (e.g. only for High risk).

### 2.5 Roles & Permissions (RBAC)
1. **Admin → Roles → New Role**, name it.
2. Tick permissions in the module × action matrix.
3. Set the **Data Scope** (All / Zone / Branch / PACS / Own). Save — immediately assignable, no deployment.

### 2.6 Users & Notifications
**Admin → Users** to create users and assign roles. **Admin → Notifications** to edit notification templates.

---

## 3. Audit Planner Guide

1. **Create the annual plan:** Planning → **New Plan** → choose Financial Year.
2. **Auto-generate** creates one item per active branch and per active PACS.
3. Or **Add Item** manually: entity, audit type, assigned auditor, priority, audit period, planned dates.
4. **Edit** or **Reschedule** an item; reschedule captures a reason and marks status `Rescheduled`.
5. **Start** an item to create the audit instance and hand it to the auditor.
6. **Submit for Approval** (only `Draft` plans) → HIA approves.

> **Tip:** only Draft plans can be submitted. If submit is blocked, check the plan's status in the selector.

---

## 4. Auditor / Branch Manager Guide

1. Open **My Audits** — filter by status.
2. Open an audit to see the **section wizard**; mandatory fields are marked `*`.
3. Answers **auto-save**; use **Save & Continue** to save manually. Attach evidence per question.
4. Watch the **Risk Score panel** update live.
5. **Raise Observation:** the Observations panel auto-detects non-compliant answers (Not Complied / Partially Complied) — click **Raise**, or use **Raise Observation** for a manual one. Add title, severity and target date.
6. **Review & Submit** — fix missing mandatory fields, then submit.

---

## 5. Compliance Owner Guide

1. Open **Compliance → My Observations**. Each row shows severity, target date and days remaining (overdue rows highlighted).
2. Click **Respond** (or open the observation).
3. Enter your rectification **response**, attach **evidence**, and choose the **outcome**: Fully Complied or Partially Complied.
4. Submit. Status becomes `Complied` or `Partially Complied` and awaits verification.
5. If the response is **rejected**, the observation returns to `Open` and you can respond again.

> The observation detail page shows the full compliance thread (responses, verifications, rejections) with dates and authors.

---

## 6. HIA Review Guide

1. Open **HIA Review** — submitted audits with their computed risk rating.
2. Open an audit to view all sections, scores, observations and attachments.
3. Take action: **Approve**, **Return for Rework**, or **Escalate**. Risk **override** requires a justification note (logged).
4. **Verify compliance:** approve → `Verified`, reject → back to `Open`, or `Accept Risk`.
5. Use the **portfolio dashboard** for bank-wide heat-map, plan vs. actual, ageing and productivity.

---

## 7. Audit Closure Guide

1. Open **Closure** — Approved audits with all observations Verified / Accepted Risk appear in the ready list.
2. Click **Generate** to produce a system-numbered **Closure Certificate** (PDF).
3. Closed audits are **locked**. Use the permissioned **Reopen** action (logged) for corrections.

> An audit cannot be closed until every observation is Verified or Accepted Risk.

---

## 8. Reports & MIS

| Report | What it shows |
|---|---|
| Plan vs. Actual | Planned vs. completed audits and variance. |
| Observation Register | All observations with status and ageing. |
| Risk Trend | Risk rating movement per entity over time. |
| Compliance Ageing | Outstanding paras by age (0-7 / 8-15 / 16-30 / 30+ days). |
| Auditor Productivity | Audits completed and turnaround per auditor. |
| Branch / PACS History | Audit history and closure status per entity. |

Reports support Excel / PDF export and are limited by your role's data scope.

---

## 9. Troubleshooting / FAQ

**I cannot see a menu item** — Menus derive from your role's permissions. Ask the Administrator to grant View.

**"Only Draft plans can be submitted"** — The selected plan is already Submitted/Approved. Create a new plan or select a Draft one.

**The form fields are not editable / not saving** — The audit may be Submitted or Closed (read-only). Only In Progress / Returned audits can be edited.

**An observation does not appear for the Compliance Owner** — The observation must be on a submitted audit, and the user's data scope must include that branch/PACS.

**Session logged out automatically** — Tokens expire for security. Log in again; if it persists, contact the Administrator.

---

*Audit Management System (AMS) — User Guide · Prepared for DCCB · Confidential*
