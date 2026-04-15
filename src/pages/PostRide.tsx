import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar as CalendarIcon, Clock, Users, IndianRupee, Map as MapIcon, Crosshair, X, Plus, Trash2, Navigation, Car, ChevronRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { Calendar } from "@/src/components/ui/calendar";
import { format, parse } from "date-fns";
import { cn } from "@/src/lib/utils";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import { toast } from "sonner";
import { getCurrentLocation } from "../lib/locationUtils";
import { LocationAutocomplete } from "../components/LocationAutocomplete";
import "leaflet/dist/leaflet.css";
import { useRides } from "../contexts/RideContext";
import { useAuth } from "../contexts/AuthContext";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map clicks
function MapClickHandler({ mode, onLocationSelect }: { mode: string | null, onLocationSelect: (lat: number, lng: number, mode: string) => void }) {
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

export default function PostRide() {
  const navigate = useNavigate();
  const { addRide } = useRides();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    from: "",
    to: "",
    date: "",
    time: "",
    seats: "",
    price: "",
    vehicleId: "",
  });

  const [stops, setStops] = useState<{id: string, name: string, coords: [number, number] | null}[]>([]);
  
  const [mapMode, setMapMode] = useState<string | null>('from');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [toCoords, setToCoords] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [isLongTrip, setIsLongTrip] = useState(false);

  // Auto-select first vehicle if available
  useEffect(() => {
    if (user?.vehicles && user.vehicles.length > 0 && !formData.vehicleId) {
      setFormData(prev => ({ ...prev, vehicleId: user.vehicles![0].id }));
    }
  }, [user, formData.vehicleId]);

  useEffect(() => {
    const initLocation = async () => {
      try {
        const result = await getCurrentLocation(true, 5000);
        setUserLocation(result.coords);
        if (!fromCoords) {
          setFormData(s => ({ ...s, from: result.name }));
          setFromCoords(result.coords);
          setMapMode('to');
        }
      } catch (error) {
        console.error("Initial location error:", error);
      }
    };
    initLocation();
  }, []);

  // Calculate distance and route when coords change
  useEffect(() => {
    const fetchRoute = async () => {
      if (fromCoords && toCoords) {
        try {
          // Construct coordinates string for OSRM: lon,lat;lon,lat;...
          const stopCoords = stops
            .filter(s => s.coords)
            .map(s => `${s.coords![1]},${s.coords![0]}`)
            .join(';');
          
          const coords = `${fromCoords[1]},${fromCoords[0]}${stopCoords ? ';' + stopCoords : ''};${toCoords[1]},${toCoords[0]}`;
          
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
          const data = await res.json();
          
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const d = Math.round(route.distance / 1000); // Convert meters to km
            const geometry = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            
            setDistance(d);
            setRouteGeometry(geometry);
          } else {
            // Fallback to straight line if OSRM fails
            const R = 6371;
            const dLat = (toCoords[0] - fromCoords[0]) * (Math.PI / 180);
            const dLon = (toCoords[1] - fromCoords[1]) * (Math.PI / 180);
            const a = 
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(fromCoords[0] * (Math.PI / 180)) * Math.cos(toCoords[0] * (Math.PI / 180)) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2); 
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
            const d = Math.round(R * c);
            
            setDistance(d);
            setRouteGeometry([fromCoords, toCoords]);
          }
        } catch (error) {
          console.error("Routing error:", error);
        }
      } else {
        setDistance(null);
        setRouteGeometry(null);
      }
    };

    fetchRoute();
  }, [fromCoords, toCoords, stops]);

  // Update isLongTrip based on 24-hour rule
  useEffect(() => {
    if (formData.date && formData.time) {
      const rideDateTime = new Date(`${formData.date}T${formData.time}`);
      const now = new Date();
      const diffHours = (rideDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      setIsLongTrip(diffHours > 24);
    } else {
      setIsLongTrip(false);
    }
  }, [formData.date, formData.time]);

  const handleLocationSelect = async (lat: number, lng: number, mode: string) => {
    toast.loading("Fetching location details...", { id: "geocode" });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&email=mdsecondary810432@gmail.com`);
      const data = await res.json();
      const placeName = data.display_name || data.address?.city || data.address?.town || data.address?.state || data.name || "Selected Location";
      
      if (mode === 'from') {
        setFormData(s => ({ ...s, from: placeName }));
        setFromCoords([lat, lng]);
        setMapMode('to'); // Auto-advance to destination
      } else if (mode === 'to') {
        setFormData(s => ({ ...s, to: placeName }));
        setToCoords([lat, lng]);
        setMapMode(null);
      } else if (mode.startsWith('stop-')) {
        const stopId = mode.split('-')[1];
        setStops(stops.map(stop => 
          stop.id === stopId ? { ...stop, name: placeName, coords: [lat, lng] } : stop
        ));
        setMapMode(null);
      }
      toast.success(`Location set to ${placeName}`, { id: "geocode" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to get location name. Using coordinates.", { id: "geocode" });
      if (mode === 'from') {
        setFormData(s => ({ ...s, from: "Selected Location" }));
        setFromCoords([lat, lng]);
        setMapMode('to');
      } else if (mode === 'to') {
        setFormData(s => ({ ...s, to: "Selected Location" }));
        setToCoords([lat, lng]);
        setMapMode(null);
      } else if (mode.startsWith('stop-')) {
        const stopId = mode.split('-')[1];
        setStops(stops.map(stop => 
          stop.id === stopId ? { ...stop, name: "Selected Location", coords: [lat, lng] } : stop
        ));
        setMapMode(null);
      }
    }
  };

  const useCurrentLocation = async (mode: string) => {
    toast.loading("Getting your location...", { id: "location" });
    try {
      const result = await getCurrentLocation();
      setUserLocation(result.coords);
      
      // Use the name directly from the utility to avoid double API calls
      if (mode === 'from') {
        setFormData(s => ({ ...s, from: result.name }));
        setFromCoords(result.coords);
        setMapMode('to');
      } else if (mode === 'to') {
        setFormData(s => ({ ...s, to: result.name }));
        setToCoords(result.coords);
        setMapMode(null);
      } else if (mode.startsWith('stop-')) {
        const stopId = mode.split('-')[1];
        setStops(stops.map(stop => 
          stop.id === stopId ? { ...stop, name: result.name, coords: result.coords } : stop
        ));
        setMapMode(null);
      }
      
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

  const addStop = () => {
    const newId = Math.random().toString(36).substring(7);
    setStops([...stops, { id: newId, name: "", coords: null }]);
    setMapMode(`stop-${newId}`); // Auto-focus map on the new stop
  };

  const removeStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
  };

  const updateStopName = (id: string, name: string) => {
    setStops(stops.map(s => s.id === id ? { ...s, name } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromCoords || !toCoords) {
      toast.error("Please select origin and destination on the map or use current location.");
      return;
    }

    setLoading(true);
    
    try {
      const selectedVehicle = user?.vehicles?.find(v => v.id === formData.vehicleId);
      const carInfo = selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : "Your Vehicle";

      // Add ride to context
      await addRide({
        from: formData.from,
        to: formData.to,
        date: formData.date,
        time: formData.time,
        seats: parseInt(formData.seats),
        price: parseInt(formData.price),
        driver: user?.name || "Anonymous",
        driverId: user?.id || "anonymous",
        rating: 5.0, // Default new user rating
        verified: true,
        car: carInfo,
        coords: fromCoords,
        stops: stops,
        distance: distance || undefined,
        isLongTrip: isLongTrip,
        routeGeometry: routeGeometry || undefined
      });

      setLoading(false);
      toast.success("Ride published successfully!");
      navigate("/");
    } catch (error) {
      setLoading(false);
      toast.error("Failed to post ride. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Post a Ride</h1>
        <p className="text-gray-500 mt-1">Share your journey and save on travel costs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Route Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-blue-600" />
                    Route Details
                  </h3>
                  
                  <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="space-y-2">
                      <Label>Origin</Label>
                      <div className="relative flex items-center">
                        <LocationAutocomplete 
                          placeholder="Leaving from..." 
                          className={`pl-9 pr-20 ${mapMode === 'from' ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                          value={formData.from}
                          onChange={(val) => setFormData({...formData, from: val})}
                          onSelect={(lat, lng) => {
                            setFromCoords([lat, lng]);
                            setMapMode('to');
                          }}
                          onFocus={() => setMapMode('from')}
                          icon={<MapPin className="h-4 w-4 text-green-600" />}
                          rightActions={
                            <>
                              <button type="button" onClick={() => useCurrentLocation('from')} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Use current location">
                                <Navigation className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => setMapMode('from')} className={`p-1.5 rounded-md transition-colors ${mapMode === 'from' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} title="Select on map">
                                <Crosshair className="h-4 w-4" />
                              </button>
                            </>
                          }
                        />
                      </div>
                    </div>

                    {/* Checkpoints / Stops */}
                    {stops.map((stop, index) => (
                      <div key={stop.id} className="space-y-2 pl-4 border-l-2 border-dashed border-gray-300 ml-2 relative">
                        <div className="absolute -left-[9px] top-8 h-4 w-4 rounded-full bg-white border-2 border-gray-300"></div>
                        <Label className="text-gray-600">Stop {index + 1}</Label>
                        <div className="relative flex items-center">
                          <LocationAutocomplete 
                            placeholder="Checkpoint / Stop..." 
                            className={`pl-9 pr-24 ${mapMode === `stop-${stop.id}` ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                            value={stop.name}
                            onChange={(val) => updateStopName(stop.id, val)}
                            onSelect={(lat, lng) => {
                              setStops(stops.map(s => s.id === stop.id ? { ...s, coords: [lat, lng] } : s));
                              setMapMode(null);
                            }}
                            onFocus={() => setMapMode(`stop-${stop.id}`)}
                            icon={<MapPin className="h-4 w-4 text-gray-400" />}
                            rightActions={
                              <>
                                <button type="button" onClick={() => setMapMode(`stop-${stop.id}`)} className={`p-1.5 rounded-md transition-colors ${mapMode === `stop-${stop.id}` ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} title="Select on map">
                                  <Crosshair className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => removeStop(stop.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Remove stop">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            }
                          />
                        </div>
                      </div>
                    ))}

                    <div className="pl-6">
                      <Button type="button" variant="outline" size="sm" onClick={addStop} className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full">
                        <Plus className="h-4 w-4 mr-1" /> Add Checkpoint
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Destination</Label>
                      <div className="relative flex items-center">
                        <LocationAutocomplete 
                          placeholder="Going to..." 
                          className={`pl-9 pr-20 ${mapMode === 'to' ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                          value={formData.to}
                          onChange={(val) => setFormData({...formData, to: val})}
                          onSelect={(lat, lng) => {
                            setToCoords([lat, lng]);
                            setMapMode(null);
                          }}
                          onFocus={() => setMapMode('to')}
                          icon={<MapPin className="h-4 w-4 text-red-600" />}
                          rightActions={
                            <button type="button" onClick={() => setMapMode('to')} className={`p-1.5 rounded-md transition-colors ${mapMode === 'to' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} title="Select on map">
                              <Crosshair className="h-4 w-4" />
                            </button>
                          }
                        />
                      </div>
                    </div>

                    {distance !== null && (
                      <div className={`p-3 rounded-lg border ${isLongTrip ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <Navigation className={`h-4 w-4 ${isLongTrip ? 'text-blue-600' : 'text-gray-500'}`} />
                          <span className="text-sm font-medium text-gray-700">Distance: <span className="font-bold">{distance} km</span></span>
                        </div>
                        {isLongTrip && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Long Trip
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Selection */}
                <div className="space-y-2">
                  <Label>Select Vehicle</Label>
                  <div className="relative">
                    <Car className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <select 
                      required
                      className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.vehicleId}
                      onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
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

                <hr className="border-gray-100" />

                {/* Schedule Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="relative cursor-pointer">
                          <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-9 justify-start text-left font-normal h-10",
                              !formData.date && "text-muted-foreground"
                            )}
                          >
                            {formData.date ? format(parse(formData.date, 'yyyy-MM-dd', new Date()), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={formData.date ? parse(formData.date, 'yyyy-MM-dd', new Date()) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, date: format(date, 'yyyy-MM-dd') });
                            }
                          }}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        required 
                        type="time" 
                        className="pl-9" 
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vacant Seats</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        required 
                        type="number" 
                        min="1" 
                        max="7" 
                        placeholder="e.g. 3" 
                        className="pl-9" 
                        value={formData.seats}
                        onChange={(e) => setFormData({...formData, seats: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fare (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        required 
                        type="number" 
                        min="50" 
                        placeholder="e.g. 450" 
                        className="pl-9" 
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? "Publishing..." : "Publish Ride"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Map Area */}
        <div className="lg:col-span-2 h-[600px] rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative">
          <MapContainer 
            center={userLocation || [20.5937, 78.9629]} 
            zoom={userLocation ? 12 : 5} 
            scrollWheelZoom={true} 
            className={`h-full w-full ${mapMode ? 'cursor-crosshair' : ''}`}
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
                <Popup>Origin: {formData.from}</Popup>
              </Marker>
            )}
            {toCoords && (
              <Marker position={toCoords}>
                <Popup>Destination: {formData.to}</Popup>
              </Marker>
            )}
            {stops.map((stop, i) => stop.coords && (
              <Marker key={stop.id} position={stop.coords}>
                <Popup>Stop {i + 1}: {stop.name}</Popup>
              </Marker>
            ))}
            
            {/* Draw route line if both from and to are set */}
            {routeGeometry && (
              <Polyline 
                positions={routeGeometry} 
                color="#2563eb" 
                weight={5} 
                opacity={0.7}
              />
            )}
            
            {/* Fallback straight line if routeGeometry is not yet available but coords are */}
            {!routeGeometry && fromCoords && toCoords && (
              <Polyline 
                positions={[fromCoords, ...stops.filter(s => s.coords).map(s => s.coords as [number, number]), toCoords]} 
                color="blue" 
                weight={4} 
                dashArray="10, 10" 
              />
            )}
          </MapContainer>
          
          {mapMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur px-6 py-3 rounded-full shadow-lg font-medium text-sm text-blue-700 flex items-center gap-2 pointer-events-none border border-blue-200 animate-in slide-in-from-top-4">
              <Crosshair className="h-5 w-5 animate-pulse" /> 
              Click on the map to select {mapMode === 'from' ? 'Origin' : mapMode === 'to' ? 'Destination' : 'Checkpoint'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
