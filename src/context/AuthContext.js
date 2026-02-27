// src/context/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, where, serverTimestamp,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../firebase/config';

const AuthContext = createContext();

const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL;
const ROLE_KEY = 'mk_role';
const UID_KEY  = 'mk_uid';

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole]       = useState(null);
  const [loading, setLoading]         = useState(true);

  // ── Determine role from a Firebase user object ───────────────────────────
  async function resolveRole(user) {
    if (!user) return null;
    // Admin identified by email in .env — no Firestore record needed
    if (user.email === ADMIN_EMAIL) return 'admin';
    // Baristas stored in Firestore at /users/{uid}
    const snap = await getDoc(doc(db, 'users', user.uid));
    return snap.exists() ? snap.data().role : null;
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  // Accepts full email (admin) or plain username (barista → appended with @maukoffie.barista)
  async function login(emailOrUsername, password) {
    const email = emailOrUsername.includes('@')
      ? emailOrUsername
      : `${emailOrUsername}@maukoffie.barista`;
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const role = await resolveRole(credential.user);
    setUserRole(role);
    return role;
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  function logout() {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(UID_KEY);
    return signOut(auth).then(() => setUserRole(null));
  }

  // ── Create barista ────────────────────────────────────────────────────────
  // Admin supplies a plain username; we construct a synthetic email for Firebase Auth.
  // Uses a temporary secondary Firebase app so the admin stays signed in.
  async function createBarista(username, password) {
    const email = `${username}@maukoffie.barista`;
    const tempApp  = initializeApp(firebaseConfig, `barista_reg_${Date.now()}`);
    const tempAuth = getAuth(tempApp);
    try {
      const credential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const uid = credential.user.uid;
      // Save barista record to Firestore
      await setDoc(doc(db, 'users', uid), {
        role:      'barista',
        username:  username,
        email:     email,
        createdAt: serverTimestamp(),
      });
      return uid;
    } finally {
      await deleteApp(tempApp);
    }
  }

  // ── List baristas from Firestore ──────────────────────────────────────────
  async function getBaristas() {
    const q = query(collection(db, 'users'), where('role', '==', 'barista'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // ── Remove barista (revokes app access) ──────────────────────────────────
  async function deleteBarista(uid) {
    await deleteDoc(doc(db, 'users', uid));
  }

  // ── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Use cached role if UID matches — eliminates Firestore round-trip on return visits
        const cachedUid  = localStorage.getItem(UID_KEY);
        const cachedRole = localStorage.getItem(ROLE_KEY);
        if (cachedUid === user.uid && cachedRole) {
          setUserRole(cachedRole);
          setLoading(false);
          return;
        }
        // First visit or different user — resolve from Firestore then cache
        const role = await resolveRole(user);
        setUserRole(role);
        if (role) {
          localStorage.setItem(ROLE_KEY, role);
          localStorage.setItem(UID_KEY, user.uid);
        }
      } else {
        setUserRole(null);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(UID_KEY);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    currentUser,
    userRole,
    login,
    logout,
    createBarista,
    getBaristas,
    deleteBarista,
    isAdmin:   userRole === 'admin',
    isBarista: userRole === 'barista',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
