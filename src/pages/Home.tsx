import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Calendar, Users, User, ShieldCheck, ArrowRight, Star, Car, Map as MapIcon, Navigation, Crosshair, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent } from "@/src/components/ui/card";
import { LocationAutocomplete } from "../components/LocationAutocomplete";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import { useRides } from "../contexts/RideContext";
import { getCurrentLocation } from "../lib/locationUtils";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CITIES = ["Mumbai", "Pune", "Delhi", "Jaipur", "Bangalore", "Mysore", "Chennai", "Pondicherry", "Hyderabad", "Vijayawada", "Kolkata", "Ahmedabad", "Surat", "Lucknow", "Chandigarh"];

// Component to handle map clicks
function MapClickHandler({ mode, onLocationSelect }: { mode: 'from' | 'to' | null, onLocationSelect: (lat: number, lng: number, mode: 'from' | 'to') => void }) {
  useMapEvents({
    click(e) {
      if (mode) {
        onLocationSelect(e.latlng.lat, e.latlng.lng, mode);
      }
    },
  });
  return null;
}

// Component to recenter map
function MapRecenter({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, 12, { animate: true });
    }
  }, [coords, map]);
  return null;
}

export default function Home() {
  const navigate = useNavigate();
  const { rides } = useRides();
  const [search, setSearch] = useState({ from: "", to: "", date: "" });
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapMode, setMapMode] = useState<'from' | 'to' | null>(null);
  const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
  const [toSuggestions, setToSuggestions] = useState<string[]>([]);
  
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [toCoords, setToCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    const initLocation = async () => {
      try {
        const result = await getCurrentLocation(true, 5000); // Quick check on mount
        setUserLocation(result.coords);
        if (!fromCoords && !search.from) {
          setSearch(s => ({ ...s, from: result.name }));
          setFromCoords(result.coords);
        }
      } catch (error) {
        console.error("Initial location error:", error);
      }
    };
    initLocation();
  }, []);

  const handleFromChange = (val: string) => {
    setSearch({ ...search, from: val });
    if (val.length > 0) {
      setFromSuggestions(CITIES.filter(c => c.toLowerCase().includes(val.toLowerCase()) && c !== search.to));
    } else {
      setFromSuggestions([]);
    }
  };

  const handleToChange = (val: string) => {
    setSearch({ ...search, to: val });
    if (val.length > 0) {
      setToSuggestions(CITIES.filter(c => c.toLowerCase().includes(val.toLowerCase()) && c !== search.from));
    } else {
      setToSuggestions([]);
    }
  };

  const handleLocationSelect = async (lat: number, lng: number, mode: 'from' | 'to') => {
    toast.loading("Fetching location details...", { id: "geocode" });
    try {
      // Reverse geocoding using Nominatim
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&email=mdsecondary810432@gmail.com`);
      const data = await res.json();
      const placeName = data.display_name || data.address?.city || data.address?.town || data.address?.state || data.name || "Selected Location";
      
      if (mode === 'from') {
        setSearch(s => ({ ...s, from: placeName }));
        setFromCoords([lat, lng]);
      } else {
        setSearch(s => ({ ...s, to: placeName }));
        setToCoords([lat, lng]);
      }
      setMapMode(null);
      toast.success(`Location set to ${placeName}`, { id: "geocode" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to get location name. Using coordinates.", { id: "geocode" });
      if (mode === 'from') {
        setSearch(s => ({ ...s, from: "Selected Location" }));
        setFromCoords([lat, lng]);
      } else {
        setSearch(s => ({ ...s, to: "Selected Location" }));
        setToCoords([lat, lng]);
      }
      setMapMode(null);
    }
  };

  const useCurrentLocation = async (mode: 'from' | 'to') => {
    toast.loading("Getting your location...", { id: "location" });
    try {
      const result = await getCurrentLocation();
      setUserLocation(result.coords);
      
      if (mode === 'from') {
        setSearch(s => ({ ...s, from: result.name }));
        setFromCoords(result.coords);
      } else {
        setSearch(s => ({ ...s, to: result.name }));
        setToCoords(result.coords);
      }
      setMapMode(null);
      
      toast.success("Location found!", { id: "location" });
    } catch (error: any) {
      console.error("Location error:", error);
      if (error.code === 1 || error.message?.includes('denied')) {
        toast.error("Location denied. Please click the 'Lock' icon in your browser address bar to allow access.", { id: "location", duration: 5000 });
      } else {
        toast.error("Could not get location. Please select on map.", { id: "location" });
      }
    }
  };

  const filteredRides = rides.filter(r => {
    if (r.isLongTrip) return false;

    // Check if the ride is in the future
    const rideDateTime = new Date(`${r.date}T${r.time}`);
    const now = new Date();
    
    // Filter out rides that are more than 12 hours in the past
    const diffHours = (rideDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < -12) return false;

    return (!search.from || r.from.toLowerCase().includes(search.from.toLowerCase()) || search.from === "Selected Location") &&
      (!search.to || r.to.toLowerCase().includes(search.to.toLowerCase()) || search.to === "Selected Location") &&
      (!search.date || r.date === search.date);
  });

  const isSearching = search.from || search.to || search.date;

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <div className="relative rounded-[2rem] overflow-hidden bg-gray-900 text-white p-10 md:p-24 text-center shadow-2xl mx-4 md:mx-auto max-w-7xl mt-6">
        <div 
          className="absolute inset-0 opacity-40 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
        <div className="relative z-10 max-w-4xl mx-auto space-y-8 pb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium text-blue-200 mb-4">
            <Car className="h-4 w-4" />
            <span>Smart Commuting for a Connected India</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
            Journey Together.<br />
            <span className="text-blue-400">Save Together.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed">
            Experience the future of intercity travel. Connect with verified co-travelers, share costs, and reduce your carbon footprint.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="-mt-24 relative z-30 mx-4 md:mx-auto max-w-5xl">
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-4 transition-all duration-300">
          <div className="flex flex-col md:flex-row gap-4">
            {/* From Input */}
          <div className="flex-1 relative group">
            <LocationAutocomplete 
              placeholder="Leaving from..." 
              className={`pl-12 pr-20 h-14 text-lg bg-gray-50/50 border-2 transition-all rounded-xl ${mapMode === 'from' ? 'border-blue-500 bg-blue-50/30' : 'border-transparent hover:bg-gray-50 focus:bg-white focus:border-blue-200'}`}
              value={search.from}
              onChange={(val) => setSearch({ ...search, from: val })}
              onSelect={(lat, lng, name) => {
                setSearch(s => ({ ...s, from: name }));
                setFromCoords([lat, lng]);
              }}
              onFocus={() => setMapMode('from')}
              icon={<MapPin className={`h-5 w-5 ${mapMode === 'from' ? 'text-blue-600' : 'text-gray-400'} transition-colors`} />}
              rightActions={
                <>
                  <button onClick={(e) => { e.preventDefault(); useCurrentLocation('from'); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Use current location">
                    <Navigation className="h-4 w-4" />
                  </button>
                  <button onClick={(e) => { e.preventDefault(); setMapMode(mapMode === 'from' ? null : 'from'); }} className={`p-1.5 rounded-md transition-colors ${mapMode === 'from' ? 'text-white bg-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} title="Select on map">
                    <Crosshair className="h-4 w-4" />
                  </button>
                </>
              }
            />
          </div>
          
          <div className="hidden md:flex items-center justify-center px-1 text-gray-300">
            <ArrowRight className="h-5 w-5" />
          </div>

          {/* To Input */}
          <div className="flex-1 relative group">
            <LocationAutocomplete 
              placeholder="Going to..." 
              className={`pl-12 pr-12 h-14 text-lg bg-gray-50/50 border-2 transition-all rounded-xl ${mapMode === 'to' ? 'border-blue-500 bg-blue-50/30' : 'border-transparent hover:bg-gray-50 focus:bg-white focus:border-blue-200'}`}
              value={search.to}
              onChange={(val) => setSearch({ ...search, to: val })}
              onSelect={(lat, lng, name) => {
                setSearch(s => ({ ...s, to: name }));
                setToCoords([lat, lng]);
              }}
              onFocus={() => setMapMode('to')}
              icon={<MapPin className={`h-5 w-5 ${mapMode === 'to' ? 'text-blue-600' : 'text-gray-400'} transition-colors`} />}
              rightActions={
                <button onClick={(e) => { e.preventDefault(); setMapMode(mapMode === 'to' ? null : 'to'); }} className={`p-1.5 rounded-md transition-colors ${mapMode === 'to' ? 'text-white bg-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} title="Select on map">
                  <Crosshair className="h-4 w-4" />
                </button>
              }
            />
          </div>
          
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
              <Calendar className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <Input 
              type="date" 
              className="pl-12 h-14 text-lg bg-gray-50/50 border-2 border-transparent hover:bg-gray-50 focus:bg-white focus:border-blue-200 rounded-xl transition-all"
              value={search.date}
              onChange={(e) => setSearch({ ...search, date: e.target.value })}
            />
          </div>
          
          <Button size="lg" className="h-14 px-8 text-lg w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all">
            <Search className="mr-2 h-5 w-5" /> Search
          </Button>
          </div>

          {/* Inline Map Selection */}
          {mapMode && (
            <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200 relative animate-in slide-in-from-top-4 duration-300">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur px-6 py-3 rounded-full shadow-lg font-medium text-sm text-blue-700 flex items-center gap-2 pointer-events-none border border-blue-200">
                <Crosshair className="h-5 w-5 animate-pulse" /> 
                Click on the map to select {mapMode === 'from' ? 'Pickup' : 'Drop-off'} Location
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMapMode(null)} 
                className="absolute top-4 right-4 z-[1000] bg-white/90 hover:bg-white rounded-full shadow-md"
              >
                <X className="h-5 w-5" />
              </Button>
              <MapContainer 
                center={userLocation || [20.5937, 78.9629]} 
                zoom={userLocation ? 12 : 5} 
                scrollWheelZoom={true} 
                className="h-full w-full cursor-crosshair"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler mode={mapMode} onLocationSelect={handleLocationSelect} />
                {userLocation && <MapRecenter coords={userLocation} />}
                
                {userLocation && (
                  <Marker position={userLocation}>
                    <Popup>Your current location</Popup>
                  </Marker>
                )}
                {fromCoords && (
                  <Marker position={fromCoords}>
                    <Popup>Pickup: {search.from}</Popup>
                  </Marker>
                )}
                {toCoords && (
                  <Marker position={toCoords}>
                    <Popup>Drop-off: {search.to}</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Results */}
      <div className="max-w-5xl mx-auto pt-4 space-y-6 w-full px-4 md:px-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            {isSearching ? "Search Results" : "Recently Posted Rides"}
          </h2>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {filteredRides.length} rides found
          </span>
        </div>

        {filteredRides.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">No rides found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your search criteria or date.</p>
            <Button variant="outline" className="mt-6" onClick={() => setSearch({ from: "", to: "", date: "" })}>
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRides.map((ride) => (
              <Card 
                key={ride.id} 
                className="group hover:border-blue-200 hover:shadow-xl transition-all duration-300 cursor-pointer bg-white border-gray-100 rounded-2xl overflow-hidden flex flex-col" 
                onClick={() => navigate(`/ride/${ride.id}`)}
              >
                <CardContent className="p-0 flex-1 flex flex-col">
                  {/* Top Section: Time & Price */}
                  <div className="p-6 pb-4 flex justify-between items-start bg-gradient-to-b from-gray-50/50 to-white">
                    <div className="space-y-1">
                      <div className="font-bold text-xl text-gray-900">{ride.time}</div>
                      <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {ride.date}
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold text-blue-600 tracking-tight">
                      ₹{ride.price}
                    </div>
                  </div>
                  
                  {/* Middle Section: Route */}
                  <div className="px-6 py-4 relative flex-1">
                    <div className="absolute left-[35px] top-6 bottom-6 w-0.5 bg-gray-200 rounded-full"></div>
                    <div className="space-y-6 relative">
                      <div className="flex items-center gap-4">
                        <div className="h-4 w-4 rounded-full border-[3px] border-blue-600 bg-white z-10 shadow-sm"></div>
                        <p className="font-semibold text-gray-900 text-lg">{ride.from}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-4 w-4 rounded-full border-[3px] border-blue-600 bg-blue-600 z-10 shadow-sm"></div>
                        <p className="font-semibold text-gray-900 text-lg">{ride.to}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Driver & Seats */}
                  <div className="p-5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        {ride.verified && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{ride.driver}</p>
                        <div className="flex items-center text-xs font-medium text-gray-500 mt-0.5">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400 mr-1" />
                          {ride.rating} • {ride.car}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                      <Users className="h-4 w-4 mr-1.5 text-blue-600" />
                      {ride.seats} left
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
