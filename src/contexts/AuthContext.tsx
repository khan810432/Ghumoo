import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
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
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  verifyUser: () => void;
  updateProfile: (updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  updateUserPassword: (userId: string, newPassword: string) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          // Parse JSON strings back to objects
          if (userData.vehicles && typeof userData.vehicles === 'string') {
            userData.vehicles = JSON.parse(userData.vehicles);
          }
          if (userData.emergencyContacts && typeof userData.emergencyContacts === 'string') {
            userData.emergencyContacts = JSON.parse(userData.emergencyContacts);
          }
          setUser(userData);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Listen to all users for admin dashboard
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
      console.error("Error fetching users:", error);
    });

    return () => unsubscribeUsers();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully');
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password. If you are a new user, please Sign Up first.');
      } else {
        toast.error(error.message || 'Invalid credentials');
      }
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
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
      toast.error(error.message || 'Failed to create account');
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

  const verifyUser = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.id), { status: 'Verified' });
        toast.success('User verified');
      } catch (error) {
        toast.error('Failed to verify user');
      }
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
        await updateDoc(doc(db, 'users', user.id), firestoreUpdates);
        toast.success('Profile updated successfully');
      } catch (error) {
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
      signup, 
      logout,
      verifyUser,
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
