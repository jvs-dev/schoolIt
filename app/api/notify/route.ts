import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

let initialized = false;

async function initFirebase() {
  if (!initialized) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Crucial: Handle newline characters from environment variables securely
          privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        }),
      });
    }
    initialized = true;
  }
}

export async function POST(request: Request) {
try {
  await initFirebase();
  
  const { title, body } = await request.json();

  // Fetch tokens from Firestore
  const db = admin.firestore();
  const docSnap = await db.collection('settings').doc('notifications').get();
  const data = docSnap.data();
  if (!data || !data.tokens || data.tokens.length === 0) {
    return NextResponse.json({ success: true, message: 'No tokens found in database' });
  }

  const tokens = data.tokens;
  // Send push notification using the Admin SDK
  const message = {
    notification: { title, body },
    webpush: {
      notification: {
        icon: '/favicon.svg', // Adds the site logo
      },
      fcmOptions: {
        link: '/', // Tells Firebase to open/focus the site natively when clicked
      }
    },
    tokens: tokens,
  };
  const response = await admin.messaging().sendEachForMulticast(message);
  return NextResponse.json({ success: true, response });


} catch (error) {
  console.error('FCM Admin SDK Error:', error);
  return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
}
}