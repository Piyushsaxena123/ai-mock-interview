import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore} from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyC7ORG2WooMLwC_OTpOmUW6dp54GVXK7hk",
  authDomain: "prepwise-fd68a.firebaseapp.com",
  projectId: "prepwise-fd68a",
  storageBucket: "prepwise-fd68a.firebasestorage.app",
  messagingSenderId: "112038775295",
  appId: "1:112038775295:web:9af5a6d5403cd412a5bfca",
  measurementId: "G-X52D6Q2XVP"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);