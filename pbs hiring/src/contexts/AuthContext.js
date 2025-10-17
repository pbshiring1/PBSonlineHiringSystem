import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { getUserRole } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user role from Firestore
        try {
          const role = await getUserRole(user.uid);
          setUserRole(role);
          
          // Update localStorage with role
          const userInfo = {
            email: user.email,
            uid: user.uid,
            name: user.displayName || user.email.split('@')[0].toUpperCase(),
            role: role || 'employee',
            photoURL: user.photoURL || null
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          localStorage.setItem('isAuthenticated', 'true');
          
          // Clear old role flags first
          localStorage.removeItem('isAdmin');
          localStorage.removeItem('isEmployer');
          
          // Set role-specific flags for backward compatibility
          if (role === 'admin') {
            localStorage.setItem('isAdmin', 'true');
          } else if (role === 'employer') {
            localStorage.setItem('isEmployer', 'true');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('employee'); // Default role
        }
      } else {
        setUserRole(null);
        // Clear localStorage when user logs out
        localStorage.removeItem('userInfo');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('isEmployer');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUserRole(null);
      localStorage.removeItem('userInfo');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('isEmployer');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    currentUser,
    userRole,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
