import React, { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';

export type Notification = {
  id: string;
  text: string;
  time: string;
  read: boolean;
};

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (text: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', text: 'Welcome to Ghumoo!', time: 'Just now', read: false }
  ]);

  const addNotification = (text: string) => {
    const newNotif = {
      id: Date.now().toString(),
      text,
      time: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    toast(text);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
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
