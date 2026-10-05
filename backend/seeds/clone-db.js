// Clone every application collection from one database into another, through a
// JSON snapshot file that can live on disk between environments.
//
//   node seeds/clone-db.js dump <file.json>   # read MONGODB_URI  -> snapshot
//   node seeds/clone-db.js load <file.json>   # snapshot -> MONGODB_URI
//
// The snapshot uses BSON Extended JSON so ObjectId, Date and Binary values
// survive the round trip. Plain JSON.stringify() would turn every _id into a
// hex string and break every reference in the target database.
const mongoose = require('mongoose');
const { EJSON } = require('bson');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

[path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')].forEach((f) => {
  if (fs.existsSync(f)) dotenv.config({ path: f });
});

// Order matters: referenced documents must exist before documents pointing at them.
const COLLECTIONS = [
  'datascoperules', 'permissions', 'roles', 'branches', 'pacs', 'financialyears',
  'audittypes', 'workflowdefinitions', 'templates', 'optionlists',
  'valuestatements', 'riskconfigs', 'notificationtemplates', 'users',
  'auditplans', 'auditplanitems', 'auditinstances', 'auditresponses',
  'observations', 'complianceactions', 'closurecertificates',
  'workflowinstances', 'workflowtransitionlogs', 'notifications',
  'activitylogs', 'attachments',
];

const [, , mode, file] = process.argv;

const dropAll = async (db) => {
  const names = (await db.listCollections().toArray()).map((c) => c.name);
  for (const name of names) {
    try {
      await db.collection(name).deleteMany({});
      await db.dropCollection(name);
    } catch (e) {
      console.log('  could not drop ' + name + ' (' + e.message.slice(0, 40) + ')');
    }
  }
  return names.length;
};

// A collection whose _id came back as a plain string will break every populate
// and save that follows, so treat it as a hard failure rather than a warning.
const assertObjectIds = (docs) => {
  const bad = docs.find((d) => d._id !== undefined && typeof d._id === 'string');
  if (bad) {
    throw new Error('expected BSON ObjectId but received the string "' + bad._id + '"');
  }
};

(async () => {
  if (!mode || !file) {
    console.error('usage: node seeds/clone-db.js <dump|load> <file.json>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const db = mongoose.connection.db;
  console.log('connected:', mongoose.connection.host, '/', mongoose.connection.name);

  if (mode === 'dump') {
    const snap = { takenAt: new Date().toISOString(), source: mongoose.connection.name, data: {} };
    for (const name of COLLECTIONS) {
      const docs = await db.collection(name).find({}).toArray();
      if (docs.length) snap.data[name] = docs;
      console.log('  read ' + name.padEnd(24) + docs.length);
    }
    assertObjectIds(Object.values(snap.data).flat());

    fs.writeFileSync(file, EJSON.stringify(snap, { relaxed: false }));
    const total = Object.values(snap.data).reduce((s, d) => s + d.length, 0);
    console.log(`\ndumped ${total} documents -> ${file}`);
    await mongoose.disconnect();
    return;
  }

  if (mode === 'load') {
    const snap = EJSON.parse(fs.readFileSync(file, 'utf8'), { relaxed: false });

    console.log('cleared ' + (await dropAll(db)) + ' collections');

    for (const name of COLLECTIONS) {
      const docs = snap.data[name];
      if (!docs || !docs.length) continue;
      try {
        assertObjectIds(docs);
        await db.collection(name).insertMany(docs, { ordered: false });
        console.log('  inserted ' + name.padEnd(24) + docs.length);
      } catch (e) {
        console.log('  FAILED ' + name + ' -> ' + e.message.slice(0, 90));
      }
    }

    console.log('\nverification:');
    let mismatches = 0;
    for (const name of COLLECTIONS) {
      const expected = (snap.data[name] || []).length;
      const actual = await db.collection(name).countDocuments();
      if (expected !== actual) mismatches += 1;
      console.log('  ' + name.padEnd(24) + actual + (expected === actual ? '' : `  (expected ${expected})`));
    }
    assertObjectIds(await db.collection('users').find({}).toArray());
    console.log('\nall user _id values are ObjectId');
    console.log(mismatches ? mismatches + ' collection count mismatch(es)' : 'counts match the snapshot');

    await mongoose.disconnect();
    return;
  }

  console.error('unknown mode: ' + mode);
  process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });