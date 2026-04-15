import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { User, MapPin, Calendar, Clock, IndianRupee, Send, ShieldCheck, AlertCircle, Navigation, AlertTriangle, X, MessageSquare } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { useRides } from "../contexts/RideContext";
import { useChat } from "../contexts/ChatContext";
import { toast } from "sonner";
import L from "leaflet";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function RideDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { isAuthenticated, user } = useAuth();
  const { rides } = useRides();
  const { joinRequests, chats, sendJoinRequest, sendMessage } = useChat();
  
  const ride = rides.find(r => r.id === id);

  const [messages, setMessages] = useState<{senderId: string, text: string, id?: string}[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isDriver, setIsDriver] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [isRideActive, setIsRideActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myRequest = joinRequests.find(r => r.rideId === id && r.passengerId === user?.id);
  const myChat = chats.find(c => c.rideId === id && (c.passengerId === user?.id || c.driverId === user?.id));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (ride && user && ride.driverId === user.id) {
      setIsDriver(true);
    }
  }, [ride, user]);

  useEffect(() => {
    if (!myChat || !myChat.id) return;

    const q = query(
      collection(db, "chats", myChat.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        senderId: doc.data().senderId,
        text: doc.data().text,
      }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [myChat]);

  if (!ride) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <h2 className="text-2xl font-bold">Ride Not Found</h2>
        <p className="text-gray-500">The ride you are looking for does not exist or has been removed.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !myChat) return;
    
    const messageText = newMessage;
    setNewMessage("");
    
    try {
      await sendMessage(myChat.id, messageText);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleRequestJoin = async () => {
    if (!isAuthenticated) {
      toast.error("Please login or sign up to request a ride.");
      navigate("/login");
      return;
    }
    try {
      await sendJoinRequest(ride.id, 'long-trip', ride.driverId);
      addNotification("Booking request sent! You can chat once the driver accepts.");
    } catch (e) {
      // Error handled in context
    }
  };

  const handleCancel = () => {
    setIsCancelled(true);
    setShowCancelConfirm(false);
    
    if (isDriver) {
      addNotification("Ride cancelled successfully. Passengers have been notified.");
    } else {
      addNotification(`Booking cancelled successfully.`);
    }
  };

  const toggleLocationSharing = () => {
    setIsSharingLocation(!isSharingLocation);
    if (!isSharingLocation) {
      addNotification("Started sharing live location with passengers.");
    } else {
      addNotification("Stopped sharing live location.");
    }
  };

  const handleSOS = () => {
    toast.error("🚨 SOS ACTIVATED! Calling 112 and sharing live location with your emergency contacts.", {
      duration: 10000,
      style: { background: '#ef4444', color: 'white', fontWeight: 'bold' }
    });
    window.location.href = "tel:112";
  };

  if (isCancelled && isDriver) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <div className="h-24 w-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold">Ride Cancelled</h2>
        <p className="text-gray-500">This ride has been cancelled and removed from listings.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Details & Map */}
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="h-64 w-full bg-gray-100 relative z-0">
            <MapContainer center={[ride.coords[0], ride.coords[1]]} zoom={10} scrollWheelZoom={false} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[ride.coords[0], ride.coords[1]]}>
                <Popup>Starting Point: {ride.from}</Popup>
              </Marker>
              {ride.stops?.map((stop, i) => stop.coords && (
                <Marker key={stop.id} position={stop.coords}>
                  <Popup>Stop {i + 1}: {stop.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{ride.from} to {ride.to}</h1>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Role:</span>
                  <span className="text-sm font-medium px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    {isDriver ? "Driver" : "Passenger"}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600 flex items-center">
                <IndianRupee className="h-5 w-5 mr-1" />{ride.price}
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{ride.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{ride.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{ride.seats} seats left</span>
              </div>
            </div>

            <hr />

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-8 w-8 text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{ride.driver}</h3>
                  {ride.verified && <ShieldCheck className="h-5 w-5 text-green-500" />}
                </div>
                <p className="text-sm text-gray-500">★ {ride.rating} • Verified Driver</p>
                <p className="text-sm text-gray-500 mt-1">Vehicle: {ride.car}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Action & Chat */}
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            {isRideActive ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-center justify-center font-bold animate-pulse">
                  Ride is currently in progress
                </div>
                <Button onClick={handleSOS} variant="destructive" className="w-full h-16 text-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:bg-red-700">
                  <AlertTriangle className="h-8 w-8" /> SOS EMERGENCY
                </Button>
                <p className="text-xs text-center text-gray-500">
                  Clicking SOS will call 112 and share your live location with your emergency contacts.
                </p>
                <Button onClick={() => setIsRideActive(false)} variant="outline" className="w-full mt-4">
                  End Journey
                </Button>
              </div>
            ) : isDriver ? (
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Manage Your Ride</h3>
                <p className="text-gray-500 text-sm">You can manage requests from your profile dashboard.</p>
                
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
                  onClick={() => setIsRideActive(true)}
                >
                  Start Journey
                </Button>

                <Button 
                  variant={isSharingLocation ? "outline" : "default"} 
                  className={`w-full ${isSharingLocation ? "border-blue-600 text-blue-600" : ""}`}
                  onClick={toggleLocationSharing}
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  {isSharingLocation ? "Stop Sharing Location" : "Share Live Location"}
                </Button>

                {!showCancelConfirm ? (
                  <Button variant="destructive" className="w-full" onClick={() => setShowCancelConfirm(true)}>
                    Cancel Ride
                  </Button>
                ) : (
                  <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-sm text-red-800 font-medium">Are you sure? This will refund all passengers and cannot be undone.</p>
                    <div className="flex gap-2">
                      <Button variant="destructive" className="flex-1" onClick={handleCancel}>Confirm</Button>
                      <Button variant="outline" className="flex-1" onClick={() => setShowCancelConfirm(false)}>Back</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : !myRequest ? (
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Join this ride</h3>
                <p className="text-gray-500 text-sm">Send a request to the driver to join this ride.</p>
                <Button className="w-full h-12 text-lg" onClick={handleRequestJoin}>
                  Request to Join
                </Button>
              </div>
            ) : myRequest.status === 'pending' ? (
              <div className="space-y-4 text-center py-6">
                <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Request Sent!</h3>
                <p className="text-gray-500 text-sm">Waiting for the driver to approve your request...</p>
              </div>
            ) : myRequest.status === 'rejected' ? (
              <div className="space-y-4 text-center py-6">
                <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <X className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-red-600">Request Rejected</h3>
                <p className="text-gray-500 text-sm">The driver has declined your request for this ride.</p>
                <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Find Other Rides</Button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Booking Confirmed!</h3>
                <p className="text-gray-500 text-sm">You are all set for your ride to {ride.to}.</p>
                
                <div className="pt-4 border-t mt-4 space-y-3">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
                    onClick={() => setIsRideActive(true)}
                  >
                    Start Ride
                  </Button>

                  {!showCancelConfirm ? (
                    <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowCancelConfirm(true)}>
                      Cancel Booking
                    </Button>
                  ) : (
                    <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-100 text-left">
                      <p className="text-sm text-red-800 font-medium">Cancel booking? This action cannot be undone.</p>
                      <div className="flex gap-2">
                        <Button variant="destructive" className="flex-1" onClick={handleCancel}>Confirm</Button>
                        <Button variant="outline" className="flex-1" onClick={() => setShowCancelConfirm(false)}>Back</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {myChat && !isCancelled && (
          <Card className="flex flex-col h-[400px]">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                Chat Session
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?.id;
                const isSystem = msg.senderId === 'system';
                return (
                  <div key={msg.id || i} className={`flex ${isSystem ? "justify-center" : isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isSystem ? "bg-gray-100 text-gray-500 text-xs italic" :
                      isMe ? "bg-blue-600 text-white rounded-br-none" : 
                      "bg-gray-100 text-gray-900 rounded-bl-none"
                    }`}>
                      {!isSystem && <p className="text-xs opacity-70 mb-1">{isMe ? "You" : isDriver ? "Passenger" : "Driver"}</p>}
                      <p>{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input 
                  placeholder="Type a message..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
