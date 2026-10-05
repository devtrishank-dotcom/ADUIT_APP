const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const roles = await Role.find();
  const getRoleId = (name) => {
    const r = roles.find((x) => x.name === name);
    return r ? r._id : null;
  };

  const branches = await Branch.find().sort({ code: 1 });
  const mainBranch = branches[0];

  const salt = await bcrypt.genSalt(10);

  const users = [
    { employeeCode: 'HIA001', name: 'HIA Officer', email: 'hia@thejjs.bank.in', password: 'hia123', role: 'HIA', designation: 'Head of Internal Audit', department: 'Internal Audit', branch: mainBranch._id },
    { employeeCode: 'PLANNER', name: 'Audit Planner', email: 'planner@thejjs.bank.in', password: 'planner123', role: 'Audit Planner', designation: 'Audit Planner', department: 'Internal Audit', branch: mainBranch._id },
    { employeeCode: 'AUDITOR', name: 'Field Auditor', email: 'auditor@thejjs.bank.in', password: 'auditor123', role: 'Auditor', designation: 'Auditor', department: 'Internal Audit', branch: mainBranch._id },
    { employeeCode: 'COMP', name: 'Compliance Officer', email: 'compliance@thejjs.bank.in', password: 'comp123', role: 'Compliance Owner', designation: 'Compliance Owner', department: 'Compliance', branch: mainBranch._id },
  ];

  for (const u of users) {
    const existing = await User.findOne({ employeeCode: u.employeeCode });
    if (existing) {
      console.log('Exists:', u.employeeCode);
      continue;
    }
    const roleId = getRoleId(u.role);
    if (!roleId) { console.log('ROLE MISSING:', u.role); continue; }
    const passwordHash = await bcrypt.hash(u.password, salt);
    await User.create({
      employeeCode: u.employeeCode,
      name: u.name,
      email: u.email,
      passwordHash,
      branch: u.branch,
      department: u.department,
      designation: u.designation,
      roles: [roleId],
      status: 'active',
    });
    console.log('Created:', u.employeeCode, '(', u.role, ')');
  }

  await mongoose.disconnect();
  console.log('\nDONE');
})().catch((e) => { console.error(e); process.exit(1); });
