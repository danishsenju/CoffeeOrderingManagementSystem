// src/context/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
          return userDoc.data().role;
        }
        return null;
      });
  }
  
  function logout() {
    return signOut(auth).then(() => {
      setUserRole(null);
    });
  }
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  const value = {
    currentUser,
    userRole,
    login,
    logout,
    isAdmin: userRole === 'admin',
    isBarista: userRole === 'barista'
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}