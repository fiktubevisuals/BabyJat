import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

// DONT pass projectId to initializeApp, so it defaults to ADC project
const app = initializeApp();
const db = getFirestore(app);
db.settings({ databaseId: firebaseConfig.firestoreDatabaseId });

async function test() {
  try {
    const res = await db.collection('orders').limit(1).get();
    console.log('Success, docs:', res.size);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
