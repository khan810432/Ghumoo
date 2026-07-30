import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export interface RideRequest {
  passengerId: string;
  passengerName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  updatedAt?: number;
}

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
  vehicle?: any;
  coords: [number, number];
  stops?: { id: string; name: string; coords: [number, number] | null }[];
  distance?: number;
  isLongTrip?: boolean;
  createdAt?: number;
  requests?: RideRequest[];
}

interface RideContextType {
  rides: Ride[];
  addRide: (ride: Omit<Ride, 'id'>) => Promise<void>;
  requestRide: (rideId: string, passengerId: string, passengerName: string) => Promise<void>;
  updateRideRequestStatus: (rideId: string, passengerId: string, status: 'accepted' | 'rejected') => Promise<void>;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export function RideProvider({ children }: { children: ReactNode }) {
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'rides'), orderBy('createdAt', 'desc'), limit(200));
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
        if (data.vehicle && typeof data.vehicle === 'string') {
          try {
            data.vehicle = JSON.parse(data.vehicle);
          } catch (e) {
            data.vehicle = undefined;
          }
        }
        ridesData.push(data as Ride);
      });
      setRides(ridesData);
    }, (error) => {
      console.warn("Firestore Rides snapshot listener note:", error);
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
    if (newRide.vehicle) {
      newRide.vehicle = JSON.stringify(newRide.vehicle);
    }

    try {
      await setDoc(doc(db, 'rides', id), newRide);
    } catch (error) {
      console.error("Error adding ride:", error);
      throw error;
    }
  };

  const requestRide = async (rideId: string, passengerId: string, passengerName: string) => {
    const ride = rides.find(r => r.id === rideId);
    if (!ride) throw new Error("Ride not found");

    const existingReq = ride.requests?.find(r => r.passengerId === passengerId);
    if (existingReq) {
      if (existingReq.status === 'pending') throw new Error("Request already pending");
      if (existingReq.status === 'accepted') throw new Error("Request already accepted");
    }

    const newRequest: RideRequest = {
      passengerId,
      passengerName,
      status: 'pending',
      createdAt: Date.now()
    };

    const updatedRequests = [...(ride.requests || []).filter(r => r.passengerId !== passengerId), newRequest];

    try {
      await updateDoc(doc(db, 'rides', rideId), { 
        requests: updatedRequests 
      });
    } catch (error) {
      console.error("Error requesting ride:", error);
      throw error;
    }
  };

  const updateRideRequestStatus = async (rideId: string, passengerId: string, status: 'accepted' | 'rejected') => {
    const ride = rides.find(r => r.id === rideId);
    if (!ride) throw new Error("Ride not found");

    const mappedRequests = (ride.requests || []).map(r => 
      r.passengerId === passengerId 
        ? { ...r, status, updatedAt: Date.now() } 
        : r
    );

    let updates: any = { requests: mappedRequests };
    
    // If accepted, decrease available seats
    if (status === 'accepted' && ride.seats > 0) {
      updates.seats = ride.seats - 1;
    }

    try {
      await updateDoc(doc(db, 'rides', rideId), updates);
    } catch (error) {
      console.error("Error updating request status:", error);
      throw error;
    }
  };

  return (
    <RideContext.Provider value={{ rides, addRide, requestRide, updateRideRequestStatus }}>
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
