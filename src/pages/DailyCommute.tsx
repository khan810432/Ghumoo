import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Car, MapPin, Navigation, Crosshair, Users, ShieldCheck, X, ArrowLeft, IndianRupee, AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { LocationAutocomplete } from "../components/LocationAutocomplete";
import { Label } from "@/src/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useCommute } from "../contexts/CommuteContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useChat } from "../contexts/ChatContext";
import { getCurrentLocation } from "../lib/locationUtils";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for active drivers
const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapClickHandler({ mode, onLocationSelect }: { mode: 'start' | 'end' | 'checkpoint' | null, onLocationSelect: (lat: number, lng: number, mode: 'start' | 'end' | 'checkpoint') => void }) {
  useMapEvents({
    click(e) {
      if (mode) {
        onLocationSelect(e.latlng.lat, e.latlng.lng, mode);
      }
    },
  });
  return null;
}

function MapRecenter({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, 13, { animate: true });
    }
  }, [coords, map]);
  return null;
}

export default function DailyCommute() {
  const { user } = useAuth();
  const location = useLocation();
  const { activeCommutes, startCommute, stopCommute, updateLocation } = useCommute();
  const { addNotification } = useNotifications();
  const { joinRequests, chats, sendJoinRequest, acceptJoinRequest, rejectJoinRequest, sendMessage, cleanupRideData } = useChat();
  
  const [viewMode, setViewMode] = useState<'find' | 'offer'>('find');
  const [mapMode, setMapMode] = useState<'start' | 'end' | 'checkpoint' | null>(null);
  
  const [startName, setStartName] = useState("");
  const [endName, setEndName] = useState("");
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [checkpoints, setCheckpoints] = useState<{name: string, coords: [number, number]}[]>([]);
  const [seats, setSeats] = useState(2);
  const [fare, setFare] = useState<number | "">("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Auto-select first vehicle if available
  useEffect(() => {
    if (user?.vehicles && user.vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(user.vehicles[0].id);
    }
  }, [user, selectedVehicleId]);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  // Handle pre-selected driver from navigation state
  useEffect(() => {
    if (location.state?.selectedDriverId) {
      setSelectedDriverId(location.state.selectedDriverId);
      setViewMode('find');
    }
  }, [location.state]);

  // Timer for request timeouts
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to calculate distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c;
  };

  // Filter commutes to those passing near the user (within 15km)
  const nearbyCommutes = activeCommutes.filter(commute => {
    if (!userLocation) return true; // Show all if location unknown
    
    const pointsToCheck = [
      commute.currentCoords || commute.startCoords,
      commute.startCoords,
      commute.endCoords,
      ...(commute.checkpoints?.map((cp: any) => cp.coords) || [])
    ];

    if (commute.routeGeometry) {
      // Sample route geometry to check if any part of the route is near
      for (let i = 0; i < commute.routeGeometry.length; i += 20) {
        pointsToCheck.push(commute.routeGeometry[i]);
      }
    }

    return pointsToCheck.some(point => calculateDistance(userLocation[0], userLocation[1], point[0], point[1]) <= 15);
  });

  // Selected driver object
  const selectedDriver = activeCommutes.find(c => c.id === selectedDriverId);

  // Check if current user is already driving
  const myActiveCommute = activeCommutes.find(c => c.driverId === user?.id);

  const fetchCurrentLocation = async () => {
    toast.loading("Getting your location...", { id: "location" });
    try {
      const result = await getCurrentLocation();
      setUserLocation(result.coords);
      setStartName(result.name);
      setStartCoords(result.coords);
      toast.success("Location found!", { id: "location" });
    } catch (error: any) {
      console.error("Location error:", error);
      const defaultCoords: [number, number] = [20.5937, 78.9629];
      setUserLocation(defaultCoords);
      setStartName("Current Location");
      setStartCoords(defaultCoords);

      if (error.code === 1) { // PERMISSION_DENIED
        toast.error("Location denied. Please click the 'Lock' icon in your browser address bar to allow access.", { 
          id: "location",
          duration: 5000 
        });
      } else {
        toast.error("Could not get location. Using default.", { id: "location" });
      }
    }
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const lastUpdateRef = useRef<number>(0);
  const lastCoordsRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (myActiveCommute) {
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setUserLocation([lat, lng]);
            
            const now = Date.now();
            // Throttle updates to once every 30 seconds OR if moved significantly
            const shouldUpdate = !lastUpdateRef.current || 
                               (now - lastUpdateRef.current > 30000) ||
                               (lastCoordsRef.current && 
                                (Math.abs(lastCoordsRef.current[0] - lat) > 0.0001 || 
                                 Math.abs(lastCoordsRef.current[1] - lng) > 0.0001));

            if (shouldUpdate && activeCommutes.some(c => c.id === myActiveCommute.id)) {
              lastUpdateRef.current = now;
              lastCoordsRef.current = [lat, lng];
              updateLocation(myActiveCommute.id, [lat, lng]).catch(err => {
                console.warn("Silent failure updating location (likely commute ended):", err);
              });
            }
          },
          (error) => console.error("Error watching position:", error),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      }
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [myActiveCommute?.id, updateLocation]);

  useEffect(() => {
    if (startCoords && endCoords) {
      const fetchRoutes = async () => {
        try {
          const coords = [
            `${startCoords[1]},${startCoords[0]}`,
            ...checkpoints.map(cp => `${cp.coords[1]},${cp.coords[0]}`),
            `${endCoords[1]},${endCoords[0]}`
          ].join(';');
          
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=true`);
          const data = await res.json();
          
          if (data.code === 'Ok' && data.routes.length > 0) {
            setAvailableRoutes(data.routes);
            setSelectedRouteIndex(0);
          }
        } catch (error) {
          console.error("Failed to fetch routes", error);
        }
      };
      fetchRoutes();
    } else {
      setAvailableRoutes([]);
    }
  }, [startCoords, endCoords, checkpoints]);

  const handleLocationSelect = async (lat: number, lng: number, mode: 'start' | 'end' | 'checkpoint') => {
    toast.loading("Fetching location details...", { id: "geocode" });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&email=mdsecondary810432@gmail.com`);
      const data = await res.json();
      const placeName = data.display_name || data.address?.road || data.address?.suburb || data.address?.city || "Selected Location";
      
      if (mode === 'start') {
        setStartName(placeName);
        setStartCoords([lat, lng]);
      } else if (mode === 'end') {
        setEndName(placeName);
        setEndCoords([lat, lng]);
      } else if (mode === 'checkpoint') {
        setCheckpoints(prev => [...prev, { name: placeName, coords: [lat, lng] }]);
      }
      setMapMode(null);
      toast.success(`Location set to ${placeName}`, { id: "geocode" });
    } catch (error) {
      toast.error("Failed to get location name.", { id: "geocode" });
      setMapMode(null);
    }
  };

  const handleStartCommute = async () => {
    if (!startCoords || !endCoords || !startName || !endName) {
      toast.error("Please set both start and end locations.");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to offer a ride.");
      return;
    }

    const selectedRoute = availableRoutes[selectedRouteIndex];
    const routeGeometry = selectedRoute 
      ? selectedRoute.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]) 
      : undefined;

    const selectedVehicle = user?.vehicles?.find(v => v.id === selectedVehicleId);
    const carInfo = selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : "Your Vehicle";

    try {
      await startCommute({
        driverId: user.id,
        driverName: user.name,
        startCoords,
        endCoords,
        currentCoords: startCoords, // Initially set to start coords
        checkpoints,
        routeGeometry,
        distance: selectedRoute?.distance,
        duration: selectedRoute?.duration,
        startName,
        endName,
        seats,
        fare: fare === "" ? 0 : Number(fare),
        car: carInfo
      });
      toast.success("You are now active! Passengers can see your route.");
    } catch (e) {
      toast.error("Failed to start commute.");
    }
  };

  const handleStopCommute = async () => {
    if (myActiveCommute) {
      try {
        await cleanupRideData(myActiveCommute.id);
        await stopCommute(myActiveCommute.id);
        toast.success("You are now offline.");
      } catch (e) {
        toast.error("Failed to stop commute.");
      }
    }
  };

  const handleSOS = () => {
    toast.error("🚨 SOS ACTIVATED! Calling 112 and sharing live location with your emergency contacts.", {
      duration: 10000,
      style: { background: '#ef4444', color: 'white', fontWeight: 'bold' }
    });
    window.location.href = "tel:112";
  };

  const handleRequestRide = async (commuteId: string, driverId: string, driverName: string) => {
    if (!user) {
      toast.error("Please login to request a ride.");
      return;
    }

    try {
      await sendJoinRequest(commuteId, 'daily-commute', driverId);
      addNotification(`${user.name} has requested to join your live ride.`);
      toast.success(`Ride request sent to ${driverName}! They will be notified.`);
    } catch (e) {
      console.error("Error requesting ride:", e);
      toast.error("Failed to request ride.");
    }
  };

  // Chat logic
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const myChat = chats.find(c => c.rideId === selectedDriverId || (myActiveCommute && c.rideId === myActiveCommute.id));
  const myRequest = joinRequests.find(r => r.rideId === selectedDriverId && r.passengerId === user?.id);

  useEffect(() => {
    if (myChat) {
      const q = query(
        collection(db, `chats/${myChat.id}/messages`),
        orderBy("createdAt", "asc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      });
      return () => unsubscribe();
    } else {
      setMessages([]);
    }
  }, [myChat?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !myChat) return;

    try {
      await sendMessage(myChat.id, chatMessage);
      setChatMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Live Rides</h1>
          <p className="text-gray-500 mt-1">Share your daily office route or find a ride along your way.</p>
        </div>
        
        <div className="bg-gray-100 p-1 rounded-xl flex">
          <button 
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'find' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => { setViewMode('find'); setSelectedDriverId(null); }}
          >
            Find a Ride
          </button>
          <button 
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'offer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => { setViewMode('offer'); setSelectedDriverId(null); }}
          >
            Offer a Ride
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          {viewMode === 'offer' ? (
            <Card className="border-blue-100 shadow-md">
              <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-600" />
                  {myActiveCommute ? "You are Active" : "Start Driving"}
                </CardTitle>
                <CardDescription>
                  {myActiveCommute ? "Passengers can currently see your route." : "Set your route and go online to pick up passengers."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {myActiveCommute ? (
                  <div className="space-y-6 text-center">
                    <div className="relative inline-flex">
                      <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center border-4 border-green-500 z-10">
                        <Navigation className="h-10 w-10 text-green-600" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-75"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">Broadcasting Route</p>
                      <p className="text-sm text-gray-500 mt-1">{myActiveCommute.startName} → {myActiveCommute.endName}</p>
                    </div>

                    {/* Requests UI */}
                    {joinRequests.filter(r => r.rideId === myActiveCommute.id && r.status === 'pending').length > 0 && (
                      <div className="mt-6 text-left space-y-3 border-t pt-4">
                        <h4 className="font-semibold text-gray-900 flex items-center justify-between">
                          Ride Requests
                          <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                            {joinRequests.filter(r => r.rideId === myActiveCommute.id && r.status === 'pending').length} New
                          </span>
                        </h4>
                        
                        {joinRequests.filter(r => r.rideId === myActiveCommute.id && r.status === 'pending').map(req => (
                           <div key={req.id} className="flex justify-between items-center bg-white border p-3 rounded-lg shadow-sm">
                             <span className="font-medium text-sm">{req.passengerName}</span>
                             <div className="flex gap-2">
                               <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-xs" onClick={() => {
                                 acceptJoinRequest(req);
                                 addNotification(`${myActiveCommute.driverName} accepted your commute request!`);
                                 toast.success(`Accepted ${req.passengerName}'s request`);
                               }}>Accept</Button>
                               <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={() => {
                                 rejectJoinRequest(req.id);
                                 toast.success(`Rejected ${req.passengerName}'s request`);
                               }}>Reject</Button>
                             </div>
                           </div>
                        ))}
                      </div>
                    )}

                    {/* Active Chats for Driver */}
                    {chats.filter(c => c.rideId === myActiveCommute.id).length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-left">Active Chats</h5>
                        <div className="space-y-2">
                          {chats.filter(c => c.rideId === myActiveCommute.id).map(chat => (
                            <div key={chat.id} className="bg-white border rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold">{chat.passengerName}</span>
                                <span className="text-[10px] text-gray-400">Accepted</span>
                              </div>
                              
                              {/* Mini Chat Window */}
                              <div className="h-32 overflow-y-auto bg-gray-50 rounded p-2 mb-2 text-xs space-y-2">
                                {messages.filter(m => m.chatId === chat.id || !m.chatId).map((m, i) => (
                                  <div key={i} className={`${m.senderId === user?.id ? 'text-right' : 'text-left'}`}>
                                    <span className={`inline-block px-2 py-1 rounded-lg ${m.senderId === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                      {m.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              
                              <form onSubmit={handleSendMessage} className="flex gap-1">
                                <Input 
                                  size={1}
                                  className="h-8 text-xs" 
                                  placeholder="Reply..." 
                                  value={chatMessage}
                                  onChange={(e) => setChatMessage(e.target.value)}
                                />
                                <Button size="sm" className="h-8 px-2"><Navigation className="h-3 w-3" /></Button>
                              </form>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button variant="destructive" className="w-full h-12 text-lg mt-4" onClick={handleStopCommute}>
                      Go Offline
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Start Location (Current Location)</Label>
                      <div className="flex gap-2">
                        <LocationAutocomplete 
                          value={startName} 
                          onChange={(val) => setStartName(val)}
                          onSelect={(lat, lng, name) => {
                            setStartName(name);
                            setStartCoords([lat, lng]);
                          }}
                          placeholder="Fetching location..." 
                          className="bg-white" 
                        />
                        <Button variant="outline" size="icon" onClick={fetchCurrentLocation} title="Use Current Location">
                          <Navigation className="h-4 w-4" />
                        </Button>
                        <Button variant={mapMode === 'start' ? "default" : "outline"} size="icon" onClick={() => setMapMode('start')} title="Select on Map">
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>End Location (e.g., Office)</Label>
                      <div className="flex gap-2">
                        <LocationAutocomplete 
                          value={endName} 
                          onChange={(val) => setEndName(val)}
                          onSelect={(lat, lng, name) => {
                            setEndName(name);
                            setEndCoords([lat, lng]);
                          }}
                          placeholder="Type or click map to select" 
                          className="bg-white" 
                        />
                        <Button variant={mapMode === 'end' ? "default" : "outline"} size="icon" onClick={() => setMapMode('end')}>
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Checkpoints (Optional)</Label>
                      {checkpoints.map((cp, idx) => (
                        <div key={idx} className="flex gap-2 items-center mb-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <Input value={cp.name} readOnly className="bg-gray-50 text-sm h-9" />
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50" onClick={() => setCheckpoints(prev => prev.filter((_, i) => i !== idx))}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant={mapMode === 'checkpoint' ? "default" : "outline"} size="sm" className="w-full text-xs h-9" onClick={() => setMapMode('checkpoint')}>
                        <MapPin className="h-3 w-3 mr-1" /> Add Checkpoint on Map
                      </Button>
                    </div>

                    {availableRoutes.length > 0 && (
                      <div className="space-y-2">
                        <Label>Select Route</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {availableRoutes.map((route, idx) => (
                            <div 
                              key={idx} 
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedRouteIndex === idx ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}
                              onClick={() => setSelectedRouteIndex(idx)}
                            >
                              <div className="flex justify-between items-center">
                                <p className="font-semibold text-sm text-gray-900">Route {idx + 1} {idx === 0 && "(Fastest)"}</p>
                                <p className="text-xs font-medium text-blue-600">{Math.round(route.duration / 60)} mins</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Distance: {(route.distance / 1000).toFixed(1)} km
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Available Seats</Label>
                        <Input type="number" min="1" max="6" value={Number.isNaN(seats) ? "" : seats} onChange={(e) => setSeats(parseInt(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Fare per Seat (₹)</Label>
                        <Input type="number" min="0" placeholder="e.g. 50" value={fare} onChange={(e) => setFare(e.target.value === "" ? "" : parseInt(e.target.value))} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Vehicle</Label>
                      <div className="relative">
                        <Car className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <select 
                          required
                          className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={selectedVehicleId}
                          onChange={(e) => setSelectedVehicleId(e.target.value)}
                        >
                          <option value="">Select a vehicle</option>
                          {user?.vehicles?.map(v => (
                            <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} ({v.licensePlate})</option>
                          ))}
                        </select>
                      </div>
                      {(!user?.vehicles || user.vehicles.length === 0) && (
                        <p className="text-xs text-amber-600">Please add a vehicle in your profile first.</p>
                      )}
                    </div>
                    
                    {mapMode && (
                      <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                        <Crosshair className="h-4 w-4" /> Click on the map to set {mapMode === 'start' ? 'Start' : mapMode === 'end' ? 'End' : 'Checkpoint'} location
                      </div>
                    )}

                    <Button className="w-full h-12 text-lg mt-4 bg-blue-600 hover:bg-blue-700" onClick={handleStartCommute}>
                      Go Active
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : selectedDriver ? (
            <Card className="border-blue-200 shadow-md">
              <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
                <Button variant="ghost" size="sm" className="w-fit mb-2 -ml-2 text-gray-500 hover:text-gray-900" onClick={() => setSelectedDriverId(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
                </Button>
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {selectedDriver.driverName?.charAt(0).toUpperCase() || "D"}
                  </div>
                  {selectedDriver.driverName || "Driver"}'s Route
                </CardTitle>
                <CardDescription>View live location and route details.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4 relative">
                  <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200"></div>
                  
                  <div className="relative flex gap-4 items-start">
                    <div className="h-6 w-6 rounded-full bg-blue-100 border-2 border-blue-600 flex-shrink-0 z-10 mt-0.5"></div>
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Start</p>
                      <p className="font-medium text-gray-900">{selectedDriver.startName}</p>
                    </div>
                  </div>

                  {selectedDriver.checkpoints?.map((cp, idx) => (
                    <div key={idx} className="relative flex gap-4 items-start">
                      <div className="h-6 w-6 rounded-full bg-white border-2 border-gray-400 flex-shrink-0 z-10 mt-0.5"></div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Checkpoint</p>
                        <p className="font-medium text-gray-900">{cp.name}</p>
                      </div>
                    </div>
                  ))}

                  <div className="relative flex gap-4 items-start">
                    <div className="h-6 w-6 rounded-full bg-red-100 border-2 border-red-600 flex-shrink-0 z-10 mt-0.5"></div>
                    <div>
                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Destination</p>
                      <p className="font-medium text-gray-900">{selectedDriver.endName}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-6">
                      <div>
                        <p className="text-sm text-gray-500">Available Seats</p>
                        <p className="font-bold text-lg flex items-center gap-1"><Users className="h-4 w-4 text-blue-600" /> {selectedDriver.seats}</p>
                      </div>
                      {selectedDriver.fare !== undefined && selectedDriver.fare > 0 && (
                        <div>
                          <p className="text-sm text-gray-500">Fare</p>
                          <p className="font-bold text-lg flex items-center gap-1"><IndianRupee className="h-4 w-4 text-green-600" /> {selectedDriver.fare}</p>
                        </div>
                      )}
                      {selectedDriver.car && (
                        <div>
                          <p className="text-sm text-gray-500">Vehicle</p>
                          <p className="font-bold text-lg flex items-center gap-1"><Car className="h-4 w-4 text-gray-400" /> {selectedDriver.car}</p>
                        </div>
                      )}
                    </div>
                    {(() => {
                      if (user && selectedDriver.driverId === user.id) return <Button variant="outline" onClick={() => { setViewMode('offer'); setSelectedDriverId(null); }}>Manage My Ride</Button>;
                      if (myRequest?.status === 'pending') return <Button disabled className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 opacity-100">Request Pending</Button>;
                      if (myRequest?.status === 'accepted') return <Button disabled className="bg-green-100 text-green-700 hover:bg-green-100 border-0 opacity-100">Request Accepted</Button>;
                      if (myRequest?.status === 'rejected') return <Button disabled className="bg-red-100 text-red-700 hover:bg-red-100 border-0 opacity-100">Rejected</Button>;
                      
                      return <Button onClick={() => handleRequestRide(selectedDriver.id, selectedDriver.driverId, selectedDriver.driverName)}>Request Ride</Button>;
                    })()}
                  </div>

                  {/* Chat Interface for Passenger */}
                  {myChat && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        Chat with {selectedDriver.driverName}
                      </h4>
                      <div 
                        ref={scrollRef}
                        className="h-48 overflow-y-auto bg-gray-50 rounded-xl p-4 mb-4 space-y-3 border border-gray-100"
                      >
                        {messages.map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}
                          >
                            <div 
                              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                                msg.senderId === user?.id 
                                  ? 'bg-blue-600 text-white rounded-tr-none' 
                                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1">
                              {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input 
                          placeholder="Type a message..." 
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700">
                          <Navigation className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  )}
                  
                  {/* SOS Button for Accepted Passengers */}
                  {selectedDriver.requests?.find(r => r.passengerId === user?.id)?.status === 'accepted' && (
                    <div className="pt-4 border-t border-gray-200 mt-2">
                      <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-center justify-center font-bold animate-pulse mb-4">
                        Ride is currently in progress
                      </div>
                      <Button onClick={handleSOS} variant="destructive" className="w-full h-14 text-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:bg-red-700">
                        <AlertTriangle className="h-6 w-6" /> SOS EMERGENCY
                      </Button>
                      <p className="text-xs text-center text-gray-500 mt-2">
                        Clicking SOS will call 112 and share your live location with your emergency contacts.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Nearby Active Drivers</CardTitle>
                <CardDescription>Drivers passing near your current location.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {nearbyCommutes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Car className="h-8 w-8 mx-auto text-gray-300 mb-3" />
                    <p>No drivers are currently passing near you.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {nearbyCommutes.map(commute => (
                      <div key={commute.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedDriverId(commute.id)}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                              {commute.driverName?.charAt(0).toUpperCase() || "D"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900 text-sm">{commute.driverName || "Driver"}</p>
                                {user && commute.driverId === user.id && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                    Your Ride
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center text-xs text-gray-500 gap-3">
                                <span className="flex items-center"><Users className="h-3 w-3 mr-1" /> {commute.seats} seats</span>
                                {commute.fare !== undefined && commute.fare > 0 && (
                                  <span className="flex items-center text-green-600 font-medium"><IndianRupee className="h-3 w-3 mr-0.5" /> {commute.fare}</span>
                                )}
                                {commute.car && (
                                  <span className="flex items-center text-gray-400"><Car className="h-3 w-3 mr-1" /> {commute.car}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {(() => {
                            if (user && commute.driverId === user.id) return <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setViewMode('offer'); setSelectedDriverId(null); }}>Manage</Button>;
                            const myReq = joinRequests.find(r => r.rideId === commute.id && r.passengerId === user?.id);
                            if (myReq?.status === 'pending') return <Button size="sm" disabled className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 opacity-100">Pending</Button>;
                            if (myReq?.status === 'accepted') return <Button size="sm" disabled className="bg-green-100 text-green-700 hover:bg-green-100 border-0 opacity-100">Accepted</Button>;
                            if (myReq?.status === 'rejected') return <Button size="sm" disabled className="bg-red-100 text-red-700 hover:bg-red-100 border-0 opacity-100">Rejected</Button>;
                            
                            return <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRequestRide(commute.id, commute.driverId, commute.driverName); }}>Request</Button>;
                          })()}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1 pl-10">
                          <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span> {commute.startName}</p>
                          <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border-2 border-red-600"></span> {commute.endName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map Area */}
        {viewMode === 'find' && !selectedDriver ? (
          <div className="lg:col-span-2 h-[600px] rounded-2xl flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200">
            <MapPin className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">Select a Driver</h3>
            <p className="text-gray-500 mt-2">Click on a driver from the list to view their live route on the map.</p>
          </div>
        ) : (
          <div className="lg:col-span-2 h-[600px] rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative">
            <MapContainer 
              center={userLocation || [20.5937, 78.9629]} 
            zoom={userLocation ? 13 : 5} 
            scrollWheelZoom={true} 
            className={`h-full w-full ${mapMode ? 'cursor-crosshair' : ''}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler mode={mapMode} onLocationSelect={handleLocationSelect} />
            {userLocation && <MapRecenter coords={userLocation} />}

            {/* Render current user's draft route */}
            {viewMode === 'offer' && startCoords && (
              <Marker position={startCoords}>
                <Popup>Start: {startName}</Popup>
              </Marker>
            )}
            {viewMode === 'offer' && endCoords && (
              <Marker position={endCoords}>
                <Popup>End: {endName}</Popup>
              </Marker>
            )}
            {viewMode === 'offer' && checkpoints.map((cp, idx) => (
              <Marker key={`cp-${idx}`} position={cp.coords}>
                <Popup>Checkpoint: {cp.name}</Popup>
              </Marker>
            ))}
            
            {/* Render actual road routes if available, otherwise fallback to straight lines */}
            {viewMode === 'offer' && availableRoutes.length > 0 ? (
              availableRoutes.map((route, idx) => {
                const isSelected = idx === selectedRouteIndex;
                const positions = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
                return (
                  <Polyline 
                    key={`route-${idx}`} 
                    positions={positions} 
                    color={isSelected ? "blue" : "gray"} 
                    weight={isSelected ? 6 : 4} 
                    opacity={isSelected ? 0.8 : 0.4}
                    eventHandlers={{
                      click: () => setSelectedRouteIndex(idx)
                    }}
                  />
                );
              })
            ) : (
              viewMode === 'offer' && startCoords && endCoords && (
                <Polyline positions={[startCoords, ...checkpoints.map(c => c.coords), endCoords]} color="blue" weight={4} dashArray="10, 10" />
              )
            )}

            {/* Render all active commutes OR only the selected one */}
            {viewMode === 'find' && (selectedDriver ? [selectedDriver] : nearbyCommutes).map(commute => {
              const currentPos = commute.currentCoords || commute.startCoords;
              if (!currentPos || isNaN(currentPos[0]) || isNaN(currentPos[1])) return null;
              if (!commute.startCoords || isNaN(commute.startCoords[0]) || isNaN(commute.startCoords[1])) return null;
              if (!commute.endCoords || isNaN(commute.endCoords[0]) || isNaN(commute.endCoords[1])) return null;

              return (
                <React.Fragment key={commute.id}>
                  <Marker position={commute.startCoords}>
                    <Popup>Start: {commute.startName}</Popup>
                  </Marker>
                  <Marker position={currentPos} icon={driverIcon}>
                    <Popup>
                      <div className="text-center">
                        <p className="font-bold">{commute.driverName}</p>
                        <p className="text-xs text-gray-500 mb-1">{commute.seats} seats available</p>
                        {commute.fare !== undefined && commute.fare > 0 && (
                          <p className="text-xs text-green-600 font-bold mb-2">₹{commute.fare} per seat</p>
                        )}
                        <p className="text-xs text-blue-600 mb-2 font-semibold">Live Location</p>
                        {(() => {
                          const myReq = joinRequests.find(r => r.rideId === commute.id && r.passengerId === user?.id);
                          if (myReq?.status === 'pending') return <Button size="sm" disabled className="w-full text-xs h-7 bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 opacity-100">Pending</Button>;
                          if (myReq?.status === 'accepted') return <Button size="sm" disabled className="w-full text-xs h-7 bg-green-100 text-green-700 hover:bg-green-100 border-0 opacity-100">Accepted</Button>;
                          if (myReq?.status === 'rejected') return <Button size="sm" disabled className="w-full text-xs h-7 bg-red-100 text-red-700 hover:bg-red-100 border-0 opacity-100">Rejected</Button>;
                          
                          return <Button size="sm" className="w-full text-xs h-7" onClick={() => handleRequestRide(commute.id, commute.driverId, commute.driverName)}>Request Ride</Button>;
                        })()}
                      </div>
                    </Popup>
                  </Marker>
                  <Marker position={commute.endCoords}>
                    <Popup>Destination: {commute.endName}</Popup>
                  </Marker>
                  {commute.checkpoints?.map((cp, idx) => {
                    if (!cp.coords || isNaN(cp.coords[0]) || isNaN(cp.coords[1])) return null;
                    return (
                      <Marker key={`active-cp-${commute.id}-${idx}`} position={cp.coords}>
                        <Popup>Checkpoint: {cp.name}</Popup>
                      </Marker>
                    );
                  })}
                  {commute.routeGeometry ? (
                    <Polyline positions={commute.routeGeometry} color={selectedDriver ? "blue" : "green"} weight={selectedDriver ? 6 : 5} opacity={0.7} />
                  ) : (
                    <Polyline positions={[commute.startCoords, ...(commute.checkpoints?.map(c => c.coords) || []), commute.endCoords]} color={selectedDriver ? "blue" : "green"} weight={selectedDriver ? 6 : 4} opacity={0.6} />
                  )}
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
        )}
      </div>
    </div>
  );
}
