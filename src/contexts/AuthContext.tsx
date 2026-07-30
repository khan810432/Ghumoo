import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';

export type UserRole = 'user' | 'admin' | null;
export type UserStatus = 'Pending' | 'Verified' | 'Rejected';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  licensePlate: string;
  color: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Storing password for demo purposes only
  status: UserStatus;
  phone?: string;
  bio?: string;
  vehicles?: Vehicle[];
  emergencyContacts?: EmergencyContact[];
}

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<{ isNewUser: boolean; uid?: string; name?: string; email?: string }>;
  completeGoogleSignup: (uid: string, name: string, email: string, phone: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  verifyUser: (additionalData?: Partial<User>) => Promise<void>;
  updateUserStatus: (userId: string, newStatus: UserStatus) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = { ...docSnap.data(), id: firebaseUser.uid } as User;
            if (userData.vehicles && typeof userData.vehicles === 'string') {
              try { userData.vehicles = JSON.parse(userData.vehicles); } catch (e) {}
            }
            if (userData.emergencyContacts && typeof userData.emergencyContacts === 'string') {
              try { userData.emergencyContacts = JSON.parse(userData.emergencyContacts); } catch (e) {}
            }
            if (!userData.status) {
              userData.status = 'Pending';
            }
            setUser(userData);
          } else {
            const fallbackUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'admin@ghumoo.com' ? 'admin' : 'user',
              status: 'Pending'
            };
            setUser(fallbackUser);
          }
          setLoading(false);
        }, (error) => {
          console.warn("User profile snapshot error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeDoc) unsubscribeDoc();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    // Listen to all users for admin dashboard ONLY if user is admin
    if (user?.role !== 'admin') {
      setUsers([]);
      return;
    }

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as User;
        if (data.vehicles && typeof data.vehicles === 'string') {
          data.vehicles = JSON.parse(data.vehicles);
        }
        if (data.emergencyContacts && typeof data.emergencyContacts === 'string') {
          data.emergencyContacts = JSON.parse(data.emergencyContacts);
        }
        usersData.push(data);
      });
      setUsers(usersData);
    }, (error) => {
      console.warn("Error fetching users (will retry when online):", error);
    });

    return () => unsubscribeUsers();
  }, [user?.role]);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully');
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password. If you are a new user, please Sign Up first.');
      } else if (error.code === 'auth/firebase-app-check-token-is-invalid' || error.message?.includes('app-check')) {
        toast.error('App Check token invalid or verification pending. Retrying request...');
      } else if (error.code === 'auth/internal-error') {
        toast.error('Firebase Auth internal error. Please check your credentials or try again.');
      } else {
        toast.error(error.message || 'Invalid credentials');
      }
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      try {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          return {
            isNewUser: true,
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Google User',
            email: firebaseUser.email || ''
          };
        }
      } catch (e) {
        console.warn("Error fetching user document during Google login:", e);
      }
      toast.success('Logged in with Google successfully');
      return { isNewUser: false };
    } catch (error: any) {
      if (error.code === 'auth/firebase-app-check-token-is-invalid' || error.message?.includes('app-check')) {
        toast.error('App Check verification failed. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Google Sign-In popup was blocked by the browser.');
      } else {
        toast.error(error.message || 'Failed to authenticate with Google');
      }
      throw error;
    }
  };

  const completeGoogleSignup = async (uid: string, name: string, email: string, phone: string) => {
    try {
      const newUser: User = {
        id: uid,
        name,
        email,
        phone,
        role: email === 'admin@ghumoo.com' ? 'admin' : 'user',
        status: 'Pending'
      };

      await setDoc(doc(db, 'users', uid), newUser);
      setUser(newUser);
      toast.success('Account created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete Google signup');
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      if (!email || !email.includes('@')) {
        toast.error('Please enter a valid email address.');
        return;
      }
      if (!password || password.length < 6) {
        toast.error('Password must be at least 6 characters.');
        return;
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const newUser: User = {
        id: firebaseUser.uid,
        name,
        email,
        password, // Storing password for demo purposes only as requested
        role: email === 'admin@ghumoo.com' ? 'admin' : 'user',
        status: 'Pending'
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      toast.success('Account created successfully');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Please sign in instead.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters long.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Please enter a valid email address.');
      } else if (error.code === 'auth/internal-error') {
        toast.error('Authentication internal error. Please check your credentials or try again.');
      } else if (error.code === 'auth/firebase-app-check-token-is-invalid' || error.message?.includes('app-check')) {
        toast.error('App Check token invalid. Please retry.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const verifyUser = async (additionalData?: Partial<User>) => {
    if (user) {
      try {
        const updates: any = { status: 'Verified', ...additionalData };
        if (updates.vehicles && typeof updates.vehicles !== 'string') {
          updates.vehicles = JSON.stringify(updates.vehicles);
        }
        if (updates.emergencyContacts && typeof updates.emergencyContacts !== 'string') {
          updates.emergencyContacts = JSON.stringify(updates.emergencyContacts);
        }
        await setDoc(doc(db, 'users', user.id), updates, { merge: true });
        setUser((prev) => (prev ? { ...prev, ...updates, status: 'Verified' } : null));
        toast.success('Account verified successfully!');
      } catch (error) {
        console.error('Failed to verify user:', error);
        toast.error('Failed to verify account. Please try again.');
      }
    }
  };

  const updateUserStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      await setDoc(doc(db, 'users', userId), { status: newStatus }, { merge: true });
      if (user?.id === userId) {
        setUser((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success(`User status updated to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (user) {
      try {
        const firestoreUpdates: any = { ...updates };
        if (updates.vehicles) {
          firestoreUpdates.vehicles = JSON.stringify(updates.vehicles);
        }
        if (updates.emergencyContacts) {
          firestoreUpdates.emergencyContacts = JSON.stringify(updates.emergencyContacts);
        }
        await setDoc(doc(db, 'users', user.id), firestoreUpdates, { merge: true });
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
        toast.success('Profile updated successfully');
      } catch (error) {
        console.error('Failed to update profile:', error);
        toast.error('Failed to update profile');
      }
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const updateUserPassword = async (userId: string, newPassword: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { password: newPassword });
      toast.success('User password updated successfully in database');
      toast.info('Note: This only updates the display password, not the actual Firebase Auth password.');
    } catch (error) {
      toast.error('Failed to update user password');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      users,
      login, 
      loginWithGoogle,
      completeGoogleSignup,
      signup, 
      logout,
      verifyUser,
      updateUserStatus,
      updateProfile,
      deleteUser,
      updateUserPassword,
      isAdmin: user?.role === 'admin',
      isAuthenticated: !!user 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
