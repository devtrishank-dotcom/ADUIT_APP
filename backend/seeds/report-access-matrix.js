// Report access matrix: log in as each demo role, hit every report endpoint and
// report the HTTP status plus how many records came back. Confirms both the
// per-role report gate and the per-role data scope on the live database.
//
//   node seeds/report-access-matrix.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
[path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')].forEach((f) => {
  if (fs.existsSync(f)) dotenv.config({ path: f });
});

const Role = require('../models/Role');
const User = require('../models/User');

const BASE = 'http://localhost:5000/api/v1';

const REPORTS = [
  ['planVsActual', '/reports/plan-vs-actual', 'array'],
  ['observationRegister', '/reports/observation-register', 'array'],
  ['riskTrend', '/reports/risk-trend', null],
  ['complianceAgeing', '/reports/compliance-ageing', null],
  ['hiaDashboard', '/reports/hia-dashboard', 'array'],
  ['auditorDashboard', '/reports/auditor-dashboard', 'array'],
  ['branchManagerDashboard', '/reports/branch-manager-dashboard', 'array'],
  ['auditRegister', '/audit', null],
];

// Pull the record count out of whichever shape the endpoint returns.
const countOf = (body, shape) => {
  if (body == null) return '-';
  if (Array.isArray(body)) return body.length;
  if (Array.isArray(body.data)) return body.data.length;
  if (Array.isArray(body.rows)) return body.rows.length;
  if (Array.isArray(body.audits)) return body.audits.length;
  if (shape === 'array' && !Array.isArray(body)) return '?';
  const keys = Object.keys(body).filter((k) => Array.isArray(body[k]));
  if (keys.length) return keys.map((k) => `${k}=${body[k].length}`).join(' ');
  return 'obj';
};

const login = async (employeeCode, password) => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeCode, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.token) throw new Error(`${employeeCode} login failed: ${JSON.stringify(json)}`);
  return json.token;
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  console.log('database:', mongoose.connection.host, '/', mongoose.connection.name);

  const roles = await mongoose.connection.db.collection('roles').find({}).toArray();
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  await mongoose.disconnect();

  const sample = [
    ['ADMIN', 'admin123'], ['HIA001', 'hia123'], ['PLANNER', 'planner123'],
    ['AUDITOR', 'auditor123'], ['COMP', 'comp123'],
    ['BM001', 'bm123'], ['BM005', 'bm123'],
  ];

  for (const [code, password] of sample) {
    const doc = users.find((u) => u.employeeCode === code);
    const roleDoc = roles.find((r) => String(r._id) === String(doc.roles[0]));
    const access = roleDoc.reportAccess || [];

    console.log('\n' + '='.repeat(96));
    console.log(`${code}  role=${roleDoc.name}  reports enabled=${access.length === 0 ? 'ALL' : access.length}`);
    console.log('='.repeat(96));

    const token = await login(code, password);
    for (const [report, url, shape] of REPORTS) {
      const allowed = access.length === 0 || access.includes(report);
      const res = await fetch(BASE + url, { headers: { Authorization: `Bearer ${token}` } });
      let shown = '-';
      try {
        shown = countOf(await res.json(), shape);
      } catch (e) { /* non-JSON body */ }
      const verdict = res.status === 200 ? '200' : String(res.status);
      const flag = res.status === 200 === allowed ? ' ' : '!';
      console.log(` ${flag} ${report.padEnd(24)} ${verdict.padEnd(5)} rows: ${shown}`);
    }
  }

  console.log('\n(! marks a row where the HTTP status disagrees with the role configuration)');
})().catch((e) => { console.error(e); process.exit(1); });