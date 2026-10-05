// Wipe every collection in the target database. Used to reset the live Atlas
// instance before a full reseed. Run with: node seeds/wipe-db.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

[path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')].forEach((f) => {
  if (fs.existsSync(f)) dotenv.config({ path: f });
});

const KEEP = ['users']; // pass a module name to keep it

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const db = mongoose.connection.db;
  console.log('target:', mongoose.connection.host, '/', mongoose.connection.name);

  const names = (await db.listCollections().toArray()).map((c) => c.name);
  console.log('dropping ' + names.length + ' collections...');

  for (const name of names) {
    try {
      await db.collection(name).deleteMany({});
      await db.dropCollection(name);
      console.log('  dropped ' + name);
    } catch (e) {
      console.log('  skip ' + name + ' (' + e.message.slice(0, 50) + ')');
    }
  }

  const left = (await db.listCollections().toArray()).map((c) => c.name);
  console.log('');
  console.log(left.length ? 'REMAINING: ' + left.join(', ') : 'database is empty');

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });