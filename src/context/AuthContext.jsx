import { createContext, useContext, useEffect, useState } from "react";
import { auth, db, googleProvider } from "../config/firebase";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword // 🆕 Imported to handle admin and standard email authentication
} from "firebase/auth";
import { ref, get, set } from "firebase/database";

const AuthContext = createContext();
const ADMIN_UID = "yma1akwM3VdmJ6p2DesN0aoGD8K2"; 

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshRole = async (uid) => {
    try {
      const userDoc = await get(ref(db, `users/${uid}`));
      if (userDoc.exists()) {
        setRole(userDoc.val().role);
      }
    } catch (err) {
      console.error("Error refreshing role configuration:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      try {
        if (currentUser) {
          setUser(currentUser);

          if (currentUser.uid === ADMIN_UID) {
            setRole("admin");
            await set(ref(db, `users/${currentUser.uid}`), {
              uid: currentUser.uid,
              name: currentUser.displayName || "Admin User",
              email: currentUser.email,
              role: "admin"
            });
            return;
          }

          // Read from Realtime Database path: users/uid
          const userDoc = await get(ref(db, `users/${currentUser.uid}`));
          if (userDoc.exists() && userDoc.val()?.role) {
            setRole(userDoc.val().role);
          } else {
            setRole("new_user");
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Authentication state handling error:", error);
        setRole("new_user");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🆕 Added standard email and password login handler for both users and admin components
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, loginWithGoogle, logout, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);