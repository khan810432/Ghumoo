import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface JoinRequest {
  id: string;
  rideId: string;
  rideType: 'long-trip' | 'daily-commute';
  passengerId: string;
  passengerName: string;
  driverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface Chat {
  id: string;
  rideId: string;
  passengerId: string;
  driverId: string;
  lastMessage: string;
  updatedAt: number;
  otherPartyName?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: any;
}

interface ChatContextType {
  joinRequests: JoinRequest[];
  chats: Chat[];
  sendJoinRequest: (rideId: string, rideType: 'long-trip' | 'daily-commute', driverId: string) => Promise<void>;
  acceptJoinRequest: (request: JoinRequest) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  sendMessage: (chatId: string, text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);

  // Listen for join requests where user is passenger or driver
  useEffect(() => {
    if (!user) {
      setJoinRequests([]);
      return;
    }

    const q = query(
      collection(db, 'joinRequests'),
      where('passengerId', '==', user.id)
    );
    const q2 = query(
      collection(db, 'joinRequests'),
      where('driverId', '==', user.id)
    );

    const unsub1 = onSnapshot(q, (snapshot) => {
      const passengerRequests = snapshot.docs.map(doc => doc.data() as JoinRequest);
      setJoinRequests(prev => {
        const otherRequests = prev.filter(r => r.driverId === user.id);
        return [...passengerRequests, ...otherRequests];
      });
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      const driverRequests = snapshot.docs.map(doc => doc.data() as JoinRequest);
      setJoinRequests(prev => {
        const otherRequests = prev.filter(r => r.passengerId === user.id);
        return [...driverRequests, ...otherRequests];
      });
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  // Listen for chats where user is passenger or driver
  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('passengerId', '==', user.id)
    );
    const q2 = query(
      collection(db, 'chats'),
      where('driverId', '==', user.id)
    );

    const unsub1 = onSnapshot(q, (snapshot) => {
      const passengerChats = snapshot.docs.map(doc => doc.data() as Chat);
      setChats(prev => {
        const otherChats = prev.filter(c => c.driverId === user.id);
        return [...passengerChats, ...otherChats];
      });
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      const driverChats = snapshot.docs.map(doc => doc.data() as Chat);
      setChats(prev => {
        const otherChats = prev.filter(c => c.passengerId === user.id);
        return [...driverChats, ...otherChats];
      });
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  const sendJoinRequest = async (rideId: string, rideType: 'long-trip' | 'daily-commute', driverId: string) => {
    if (!user) throw new Error("User not authenticated");

    const id = `${rideId}_${user.id}`;
    const newRequest: JoinRequest = {
      id,
      rideId,
      rideType,
      passengerId: user.id,
      passengerName: user.name,
      driverId,
      status: 'pending',
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'joinRequests', id), newRequest);
      toast.success("Join request sent!");
    } catch (error) {
      console.error("Error sending join request:", error);
      toast.error("Failed to send join request");
      throw error;
    }
  };

  const acceptJoinRequest = async (request: JoinRequest) => {
    try {
      // 1. Update request status
      await updateDoc(doc(db, 'joinRequests', request.id), {
        status: 'accepted'
      });

      // 2. Create a chat session
      const chatId = `${request.rideId}_${request.passengerId}`;
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      
      if (!chatDoc.exists()) {
        const newChat: Chat = {
          id: chatId,
          rideId: request.rideId,
          passengerId: request.passengerId,
          driverId: request.driverId,
          lastMessage: "Request accepted. You can now chat!",
          updatedAt: Date.now()
        };
        await setDoc(doc(db, 'chats', chatId), newChat);
        
        // Add initial message
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          senderId: 'system',
          text: "Request accepted. You can now chat!",
          createdAt: serverTimestamp()
        });
      }

      toast.success("Request accepted!");
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to accept request");
      throw error;
    }
  };

  const rejectJoinRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'joinRequests', requestId), {
        status: 'rejected'
      });
      toast.success("Request rejected");
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
      throw error;
    }
  };

  const sendMessage = async (chatId: string, text: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId: user.id,
        text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  return (
    <ChatContext.Provider value={{ joinRequests, chats, sendJoinRequest, acceptJoinRequest, rejectJoinRequest, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
