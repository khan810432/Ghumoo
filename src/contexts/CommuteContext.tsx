import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

export interface CommuteRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  status: 'pending' | 'accepted' | 'rejected';
  updatedAt?: number;
}

export interface CommuteRoute {
  id: string;
  driverId: string;
  driverName: string;
  startCoords: [number, number];
  endCoords: [number, number];
  currentCoords: [number, number];
  checkpoints?: { name: string; coords: [number, number] }[];
  routeGeometry?: [number, number][];
  distance?: number;
  duration?: number;
  startName: string;
  endName: string;
  status: 'active' | 'completed';
  seats: number;
  fare?: number;
  requests?: CommuteRequest[];
  updatedAt?: number;
}

interface CommuteContextType {
  activeCommutes: CommuteRoute[];
  startCommute: (commute: Omit<CommuteRoute, 'id' | 'status'>) => Promise<void>;
  stopCommute: (id: string) => Promise<void>;
  updateLocation: (id: string, coords: [number, number]) => Promise<void>;
  requestCommute: (commuteId: string, passengerId: string, passengerName: string) => Promise<void>;
  updateRequestStatus: (commuteId: string, requestId: string, status: 'accepted' | 'rejected') => Promise<void>;
}

const CommuteContext = createContext<CommuteContextType | undefined>(undefined);

export function CommuteProvider({ children }: { children: React.ReactNode }) {
  const [activeCommutes, setActiveCommutes] = useState<CommuteRoute[]>([]);

  useEffect(() => {
    const path = 'commutes';
    const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commutesData: CommuteRoute[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        if (data.checkpoints && typeof data.checkpoints === 'string') {
          try { data.checkpoints = JSON.parse(data.checkpoints); } catch (e) { data.checkpoints = []; }
        }
        if (data.routeGeometry && typeof data.routeGeometry === 'string') {
          try { data.routeGeometry = JSON.parse(data.routeGeometry); } catch (e) { data.routeGeometry = []; }
        }
        if (data.requests && typeof data.requests === 'string') {
          try { data.requests = JSON.parse(data.requests); } catch (e) { data.requests = []; }
        }
        commutesData.push(data as CommuteRoute);
      });
      setActiveCommutes(commutesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  const startCommute = async (commute: Omit<CommuteRoute, 'id' | 'status'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newCommute: any = {
      ...commute,
      id,
      status: 'active',
      updatedAt: Date.now()
    };

    if (newCommute.checkpoints) newCommute.checkpoints = JSON.stringify(newCommute.checkpoints);
    if (newCommute.routeGeometry) newCommute.routeGeometry = JSON.stringify(newCommute.routeGeometry);
    if (newCommute.requests) newCommute.requests = JSON.stringify(newCommute.requests);

    const path = `commutes/${id}`;
    try {
      await setDoc(doc(db, 'commutes', id), newCommute);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  };

  const stopCommute = async (id: string) => {
    const path = `commutes/${id}`;
    try {
      await deleteDoc(doc(db, 'commutes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  };

  const updateLocation = async (id: string, coords: [number, number]) => {
    const path = `commutes/${id}`;
    try {
      await updateDoc(doc(db, 'commutes', id), { 
        currentCoords: coords,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  };

  const requestCommute = async (commuteId: string, passengerId: string, passengerName: string) => {
    const commute = activeCommutes.find(c => c.id === commuteId);
    if (!commute) return;

    const existingRequests = commute.requests || [];
    const existingReqIndex = existingRequests.findIndex(r => r.passengerId === passengerId);
    
    let updatedRequests = [...existingRequests];
    if (existingReqIndex >= 0) {
      updatedRequests[existingReqIndex] = {
        ...updatedRequests[existingReqIndex],
        status: 'pending',
        updatedAt: Date.now()
      };
    } else {
      updatedRequests.push({
        id: Math.random().toString(36).substring(2, 9),
        passengerId,
        passengerName,
        status: 'pending',
        updatedAt: Date.now()
      });
    }

    const path = `commutes/${commuteId}`;
    try {
      await updateDoc(doc(db, 'commutes', commuteId), { 
        requests: JSON.stringify(updatedRequests),
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  };

  const updateRequestStatus = async (commuteId: string, requestId: string, status: 'accepted' | 'rejected') => {
    const commute = activeCommutes.find(c => c.id === commuteId);
    if (!commute) return;

    const updatedRequests = (commute.requests || []).map(r => 
      r.id === requestId ? { ...r, status, updatedAt: Date.now() } : r
    );

    const path = `commutes/${commuteId}`;
    try {
      await updateDoc(doc(db, 'commutes', commuteId), { 
        requests: JSON.stringify(updatedRequests),
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  };

  return (
    <CommuteContext.Provider value={{ activeCommutes, startCommute, stopCommute, updateLocation, requestCommute, updateRequestStatus }}>
      {children}
    </CommuteContext.Provider>
  );
}

export function useCommute() {
  const context = useContext(CommuteContext);
  if (context === undefined) {
    throw new Error('useCommute must be used within a CommuteProvider');
  }
  return context;
}
