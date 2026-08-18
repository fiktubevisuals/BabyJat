const admin = require('firebase-admin');
admin.initializeApp();

async function setAdmin(email) {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) {
      console.log('User not found in DB with email:', email);
      process.exit(1);
    }
    
    for (const doc of snapshot.docs) {
      console.log('Found user with ID:', doc.id);
      await doc.ref.update({ role: 'admin' });
      console.log('Successfully updated role to admin');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setAdmin('mubirushafik1088@gmail.com');
