import React, { useState, useEffect } from "react";
import { useAuth, Vehicle, EmergencyContact } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useRides } from "../contexts/RideContext";
import { useCommute } from "../contexts/CommuteContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { User, Car, ShieldCheck, Mail, Phone, Info, Plus, Trash2, AlertTriangle, MessageSquare, Check, X, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { joinRequests, chats, acceptJoinRequest, rejectJoinRequest } = useChat();
  const { rides } = useRides();
  const { activeCommutes } = useCommute();
  const navigate = useNavigate();
  
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(user?.vehicles || []);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [color, setColor] = useState("");

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(user?.emergencyContacts || []);
  const [showAddContact, setShowAddContact] = useState(false);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRelation, setEcRelation] = useState("");

  const [activeTab, setActiveTab] = useState<'profile' | 'requests' | 'chats'>('profile');

  // Sync local state when user object updates from AuthContext
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setVehicles(user.vehicles || []);
      setEmergencyContacts(user.emergencyContacts || []);
    }
  }, [user]);

  const handleSaveProfile = () => {
    updateProfile({ name, phone, bio });
  };

  const handleAddVehicle = () => {
    if (!make || !model || !licensePlate) {
      toast.error("Please fill in all required vehicle details (Make, Model, and License Plate)");
      return;
    }
    
    const newVehicle: Vehicle = {
      id: Math.random().toString(36).substring(2, 9),
      make,
      model,
      year,
      licensePlate,
      color
    };
    
    const updatedVehicles = [...vehicles, newVehicle];
    setVehicles(updatedVehicles);
    updateProfile({ vehicles: updatedVehicles });
    
    setMake("");
    setModel("");
    setYear("");
    setLicensePlate("");
    setColor("");
    setShowAddVehicle(false);
  };

  const handleRemoveVehicle = (id: string) => {
    const updatedVehicles = vehicles.filter(v => v.id !== id);
    setVehicles(updatedVehicles);
    updateProfile({ vehicles: updatedVehicles });
  };

  const handleAddContact = () => {
    if (!ecName || !ecPhone) return;
    
    const newContact: EmergencyContact = {
      id: Math.random().toString(36).substring(2, 9),
      name: ecName,
      phone: ecPhone,
      relation: ecRelation
    };
    
    const updatedContacts = [...emergencyContacts, newContact];
    setEmergencyContacts(updatedContacts);
    updateProfile({ emergencyContacts: updatedContacts });
    
    setEcName("");
    setEcPhone("");
    setEcRelation("");
    setShowAddContact(false);
  };

  const handleRemoveContact = (id: string) => {
    const updatedContacts = emergencyContacts.filter(c => c.id !== id);
    setEmergencyContacts(updatedContacts);
    updateProfile({ emergencyContacts: updatedContacts });
  };

  if (!user) return null;

  const pendingRequests = joinRequests.filter(r => r.driverId === user.id && r.status === 'pending');
  const myChats = chats.map(chat => {
    const isPassenger = chat.passengerId === user.id;
    return {
      ...chat,
      otherPartyName: isPassenger ? chat.driverName : chat.passengerName
    };
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account, requests, and chats.</p>
        </div>
        
        <div className="bg-gray-100 p-1 rounded-xl flex w-full md:w-auto">
          <button 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${activeTab === 'requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('requests')}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'chats' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('chats')}
          >
            Chats
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Profile Details
                </CardTitle>
                <CardDescription>Update your contact information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input className="pl-9 bg-gray-50" value={user.email} readOnly />
                  </div>
                  <p className="text-xs text-gray-500">Email cannot be changed.</p>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Verification Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {user.status === 'Verified' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending Verification
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  About You
                </CardTitle>
                <CardDescription>Tell other users a bit about yourself.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <textarea 
                    className="w-full min-h-[100px] p-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="I love listening to podcasts and enjoy quiet rides..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveProfile} className="w-full">Save Profile Changes</Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-blue-600" />
                    Vehicle Details
                  </CardTitle>
                  <CardDescription>Manage your vehicles for offering rides.</CardDescription>
                </div>
                {!showAddVehicle && (
                  <Button size="sm" onClick={() => setShowAddVehicle(true)} className="flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add Vehicle
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {vehicles.length > 0 ? (
                  <div className="space-y-4">
                    {vehicles.map((v) => (
                      <div key={v.id} className="flex justify-between items-center p-4 border rounded-lg bg-gray-50">
                        <div>
                          <p className="font-semibold text-gray-900">{v.year} {v.make} {v.model}</p>
                          <p className="text-sm text-gray-500">License: <span className="uppercase">{v.licensePlate}</span> • Color: {v.color}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveVehicle(v.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  !showAddVehicle && (
                    <div className="text-center p-6 border-2 border-dashed rounded-lg text-gray-500">
                      <Car className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p>No vehicles added yet.</p>
                    </div>
                  )
                )}

                {showAddVehicle && (
                  <div className="space-y-4 p-4 border rounded-lg bg-white">
                    <h3 className="font-medium text-gray-900 mb-2">Add New Vehicle</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Make</Label>
                        <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Honda" />
                      </div>
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. City" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2022" />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Silver" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>License Plate</Label>
                      <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="e.g. MH 01 AB 1234" className="uppercase" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAddVehicle} className="flex-1">Save Vehicle</Button>
                      <Button onClick={() => setShowAddVehicle(false)} variant="outline" className="flex-1">Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-red-100 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-red-50/50 rounded-t-xl">
                <div>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Emergency Contacts
                  </CardTitle>
                  <CardDescription>Contacts to notify during an SOS emergency.</CardDescription>
                </div>
                {!showAddContact && (
                  <Button size="sm" variant="outline" onClick={() => setShowAddContact(true)} className="flex items-center gap-1 border-red-200 text-red-700 hover:bg-red-50">
                    <Plus className="h-4 w-4" /> Add Contact
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {emergencyContacts.length > 0 ? (
                  <div className="space-y-4">
                    {emergencyContacts.map((c) => (
                      <div key={c.id} className="flex justify-between items-center p-4 border border-red-100 rounded-lg bg-white">
                        <div>
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          <p className="text-sm text-gray-500">{c.phone} • <span className="capitalize">{c.relation}</span></p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveContact(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  !showAddContact && (
                    <div className="text-center p-6 border-2 border-dashed border-red-100 rounded-lg text-gray-500">
                      <AlertTriangle className="h-8 w-8 mx-auto text-red-300 mb-2" />
                      <p>No emergency contacts added.</p>
                    </div>
                  )
                )}

                {showAddContact && (
                  <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50/30">
                    <h3 className="font-medium text-gray-900 mb-2">Add Emergency Contact</h3>
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="e.g. Jane Doe" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} placeholder="e.g. 9876543210" />
                      </div>
                      <div className="space-y-2">
                        <Label>Relation</Label>
                        <Input value={ecRelation} onChange={(e) => setEcRelation(e.target.value)} placeholder="e.g. Spouse, Parent" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAddContact} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Save Contact</Button>
                      <Button onClick={() => setShowAddContact(false)} variant="outline" className="flex-1">Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Pending Ride Requests
            </CardTitle>
            <CardDescription>Manage requests from passengers who want to join your rides.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.length > 0 ? (
              <div className="divide-y">
                {pendingRequests.map((req) => {
                  const ride = rides.find(r => r.id === req.rideId) || activeCommutes.find(c => c.id === req.rideId);
                  return (
                    <div key={req.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{req.passengerName}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full uppercase">
                            {req.rideType.replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Ride: {ride ? `${ride.from || (ride as any).startName} to ${ride.to || (ride as any).endName}` : "Unknown Ride"}
                        </p>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                          className="flex-1 md:flex-none bg-green-600 hover:bg-green-700"
                          onClick={() => acceptJoinRequest(req)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Accept
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 md:flex-none text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => rejectJoinRequest(req.id)}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No pending requests at the moment.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'chats' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Active Chats
            </CardTitle>
            <CardDescription>Real-time conversations with your drivers or passengers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {myChats.length > 0 ? (
              <div className="divide-y">
                {myChats.map((chat) => (
                  <div 
                    key={chat.id} 
                    className="py-4 flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer px-2 rounded-lg"
                    onClick={() => {
                      if (chat.rideType === 'daily-commute') {
                        navigate('/daily-commute', { state: { selectedDriverId: chat.rideId } });
                      } else {
                        navigate(`/ride/${chat.rideId}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {chat.otherPartyName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{chat.otherPartyName}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[200px] md:max-w-md">{chat.lastMessage}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No active chats yet. Join a ride to start chatting!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
