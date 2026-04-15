import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export type Notification = {
  id: string;
  userId: string;
  text: string;
  time: string;
  read: boolean;
  createdAt: number;
};

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (text: string, userId?: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const path = 'notifications';
    const q = query(
      collection(db, path),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const addNotification = async (text: string, userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    const path = 'notifications';
    try {
      await addDoc(collection(db, path), {
        userId: targetUserId,
        text,
        time: 'Just now',
        read: false,
        createdAt: Date.now()
      });
      if (targetUserId === user?.id) {
        toast(text);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    const unreadNotifs = notifications.filter(n => !n.read);
    const promises = unreadNotifs.map(n => 
      updateDoc(doc(db, 'notifications', n.id), { read: true })
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const clearNotifications = async () => {
    if (!user) return;
    
    const promises = notifications.map(n => 
      deleteDoc(doc(db, 'notifications', n.id))
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAllAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
