import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

export interface Ride {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  driver: string;
  driverId: string;
  seats: number;
  price: number;
  rating: number;
  verified: boolean;
  car: string;
  coords: [number, number];
  stops?: { id: string; name: string; coords: [number, number] | null }[];
  distance?: number;
  isLongTrip?: boolean;
  createdAt?: number;
}

interface RideContextType {
  rides: Ride[];
  addRide: (ride: Omit<Ride, 'id'>) => Promise<void>;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export function RideProvider({ children }: { children: ReactNode }) {
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'rides'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ridesData: Ride[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        if (data.stops && typeof data.stops === 'string') {
          try {
            data.stops = JSON.parse(data.stops);
          } catch (e) {
            data.stops = [];
          }
        }
        ridesData.push(data as Ride);
      });
      setRides(ridesData);
    }, (error) => {
      console.error("Error fetching rides:", error);
    });

    return () => unsubscribe();
  }, []);

  const addRide = async (rideData: Omit<Ride, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newRide: any = {
      ...rideData,
      id,
      createdAt: Date.now()
    };
    
    if (newRide.stops) {
      newRide.stops = JSON.stringify(newRide.stops);
    }

    try {
      await setDoc(doc(db, 'rides', id), newRide);
    } catch (error) {
      console.error("Error adding ride:", error);
      throw error;
    }
  };

  return (
    <RideContext.Provider value={{ rides, addRide }}>
      {children}
    </RideContext.Provider>
  );
}

export function useRides() {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error('useRides must be used within a RideProvider');
  }
  return context;
}
