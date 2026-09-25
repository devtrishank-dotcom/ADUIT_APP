const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');

const normalizeStatus = (status) =>
  String(status || '').trim().toLowerCase() === 'active' ? 'active' : 'inactive';

const ROLE_USERS = [
  {
    key: 'auditor',
    roleName: 'Auditor',
    prefix: 'AUD',
    password: 'auditor123',
    designation: 'Auditor',
    department: 'Internal Audit',
    emailPrefix: 'auditor',
  },
  {
    key: 'manager',
    roleName: 'Branch Manager',
    prefix: 'BM',
    password: 'bm123',
    designation: 'Branch Manager',
    department: 'Operations',
    emailPrefix: 'bm',
  },
  {
    key: 'compliance',
    roleName: 'Compliance Owner',
    prefix: 'CO',
    password: 'comp123',
    designation: 'Compliance Owner',
    department: 'Compliance',
    emailPrefix: 'compliance',
  },
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audit_management');
    console.log('Connected for branch user seeding.');

    const branches = await Branch.find().sort({ code: 1 });
    const roles = await Role.find();
    const roleByName = (name) => roles.find((r) => r.name === name);

    if (branches.length === 0) {
      console.log('No branches found. Run the base seed first.');
      return;
    }

    // 1. Normalise existing user status values to lowercase.
    const existingUsers = await User.find();
    let statusFixed = 0;
    for (const user of existingUsers) {
      const normalized = normalizeStatus(user.status);
      if (user.status !== normalized) {
        user.status = normalized;
        await user.save();
        statusFixed += 1;
      }
    }
    console.log(`Normalised status on ${statusFixed} user(s).`);

    // 2. Make sure any user without roles gets a sensible default role.
    for (const user of await User.find({ $or: [{ roles: { $size: 0 } }, { roles: { $exists: false } }] })) {
      const guess = /compliance/i.test(`${user.designation || ''} ${user.name || ''}`)
        ? 'Compliance Owner'
        : /manager/i.test(`${user.designation || ''} ${user.name || ''}`)
          ? 'Branch Manager'
          : /audit/i.test(`${user.designation || ''} ${user.name || ''}`)
            ? 'Auditor'
            : null;
      const role = guess ? roleByName(guess) : null;
      if (role) {
        user.roles = [role._id];
        user.status = 'active';
        await user.save();
        console.log(`Assigned ${guess} role to ${user.employeeCode} (${user.name}).`);
      }
    }

    const salt = await bcrypt.genSalt(10);

    let created = 0;
    let updated = 0;

    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      const seq = String(i + 1).padStart(3, '0');

      for (const def of ROLE_USERS) {
        const role = roleByName(def.roleName);
        if (!role) continue;

        const employeeCode = `${def.prefix}${seq}`;
        const email = `${def.emailPrefix}${seq}@dccb.gov.in`;
        const name = `${def.designation} - ${branch.name}`;

        const existing = await User.findOne({ employeeCode });
        if (existing) {
          existing.name = existing.name || name;
          existing.branch = branch._id;
          existing.designation = def.designation;
          existing.department = def.department;
          existing.status = 'active';
          existing.roles = [role._id];
          await existing.save();
          updated += 1;
        } else {
          const passwordHash = await bcrypt.hash(def.password, salt);
          await User.create({
            employeeCode,
            name,
            email,
            passwordHash,
            branch: branch._id,
            department: def.department,
            designation: def.designation,
            roles: [role._id],
            status: 'active',
          });
          created += 1;
        }
      }
    }

    console.log(`\nBranch users seeded: ${created} created, ${updated} updated.`);
    console.log('Credentials (per branch index, e.g. 001 = first branch):');
    console.log('  Auditor          AUD001..  password auditor123');
    console.log('  Branch Manager   BM001..   password bm123');
    console.log('  Compliance Owner CO001..   password comp123');
  } catch (error) {
    console.error('Branch user seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
