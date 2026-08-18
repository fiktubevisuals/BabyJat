const admin = require('firebase-admin');
admin.initializeApp();

async function setAdmin(email) {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('User found:', userRecord.uid);
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).update({ role: 'admin' });
    console.log('Successfully updated user to admin');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setAdmin('mubirushafik1088@gmail.com');
