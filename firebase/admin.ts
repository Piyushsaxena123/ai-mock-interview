import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// --- THIS IS THE FIX ---
// This function correctly formats the key for both local and Vercel
const formatPrivateKey = (key: string) => {
  if (!key) {
    throw new Error("FIREBASE_PRIVATE_KEY is not set");
  }
  // If it's on Vercel, it's already formatted.
  // If it's local, it has \\n, so we replace them.
  return key.replace(/\\n/g, '\n');
};
// --- END OF FIX ---

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  const apps = getApps();

  if (!apps.length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Use the new formatting function
        privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
      }),
    });
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

export const { auth, db } = initFirebaseAdmin();