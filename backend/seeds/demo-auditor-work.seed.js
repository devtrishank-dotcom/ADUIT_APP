const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('../models/User');
const AuditInstance = require('../models/AuditInstance');
const AuditPlanItem = require('../models/AuditPlanItem');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const auditor = await User.findOne({ employeeCode: 'AUDITOR' });
  if (!auditor) throw new Error('AUDITOR user missing');

  // Give the Auditor role real work: mark every in-progress/closed audit as
  // started by the auditor so "My Audits" and the auditor dashboard have data.
  const res = await AuditInstance.updateMany(
    { status: { $in: ['InProgress', 'Closed', 'UnderReview'] } },
    { $set: { startedBy: auditor._id } }
  );
  console.log(`Audit instances assigned to AUDITOR: ${res.modifiedCount}`);

  // Assign plan items to the auditor so the Planning grid shows a name.
  const itemRes = await AuditPlanItem.updateMany(
    { status: { $in: ['Planned', 'InProgress'] } },
    { $set: { assignedTo: auditor._id } }
  );
  console.log(`Plan items assigned to AUDITOR: ${itemRes.modifiedCount}`);

  const counts = await AuditInstance.aggregate([
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  console.log('Instance statuses:', JSON.stringify(counts));

  await mongoose.disconnect();
  console.log('DONE');
})().catch((e) => { console.error(e); process.exit(1); });