import {
  browserLocalPersistence,
  deleteUser,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithPopup,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import {
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { GradebookDocument } from "./gradebook";

const config = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || "AIzaSyA5Oht7hR8r7zKzl3H21v6M5kh1-sclBEo",
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || "punkte-342dd.firebaseapp.com",
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || "punkte-342dd",
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || "punkte-342dd.firebasestorage.app",
  messagingSenderId:
    import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "199141597762",
  appId:
    import.meta.env.PUBLIC_FIREBASE_APP_ID ||
    "1:199141597762:web:05fed150c475851d5683db",
};

let services: { auth: ReturnType<typeof getAuth>; db: Firestore } | undefined;

export async function initializeFirebase() {
  if (typeof window === "undefined") {
    throw new Error("Firebase kann nur im Browser initialisiert werden.");
  }
  if (!services) {
    const app = getApps().length ? getApp() : initializeApp(config);
    const auth = getAuth(app);
    services = { auth, db: getFirestore(app) };
  }
  await setPersistence(services.auth, browserLocalPersistence);
  await getRedirectResult(services.auth);
  return services;
}

export function watchAuthentication(
  callback: (user: User | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!services) throw new Error("Firebase wurde noch nicht initialisiert.");
  return onAuthStateChanged(services.auth, callback, onError);
}

export async function signInWithGoogle() {
  if (!services) throw new Error("Firebase wurde noch nicht initialisiert.");
  try {
    await signInWithPopup(services.auth, new GoogleAuthProvider());
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "auth/popup-blocked"
    ) {
      await signInWithRedirect(services.auth, new GoogleAuthProvider());
      return;
    }
    throw error;
  }
}

export async function signOutFromGoogle() {
  if (!services) throw new Error("Firebase wurde noch nicht initialisiert.");
  await signOut(services.auth);
}

function userGradebookRef(db: Firestore, uid: string) {
  return doc(db, "users", uid, "gradebook", "current");
}

export function watchUserGradebook(
  db: Firestore,
  uid: string,
  onValue: (document: GradebookDocument | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userGradebookRef(db, uid),
    (snapshot) => onValue(snapshot.exists() ? (snapshot.data() as GradebookDocument) : null),
    onError,
  );
}

export async function saveUserGradebook(
  db: Firestore,
  uid: string,
  document: GradebookDocument,
) {
  await setDoc(userGradebookRef(db, uid), document);
}

export async function deleteUserGradebook(db: Firestore, uid: string) {
  await deleteDoc(userGradebookRef(db, uid));
}

export async function deleteGoogleAccount(user: User, db: Firestore) {
  await reauthenticateWithPopup(user, new GoogleAuthProvider());
  await deleteUserGradebook(db, user.uid);
  await deleteUser(user);
}
