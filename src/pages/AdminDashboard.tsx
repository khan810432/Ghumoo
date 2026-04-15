import React, { useState } from "react";
import { Users, ShieldAlert, IndianRupee, TrendingUp, XCircle, RefreshCcw, X, Mail, Phone, Car, AlertTriangle, Key, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import { useRides } from "../contexts/RideContext";

export default function AdminDashboard() {
  const { users, deleteUser, updateUserPassword } = useAuth();
  const { rides } = useRides();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  
  // Calculate total revenue from all rides (assuming price * seats for simplicity, or just sum of prices)
  const totalRevenue = rides.reduce((acc, ride) => acc + (ride.price * (ride.seats || 1)), 0);
  
  // Count rides per user
  const getUserRidesCount = (userName: string) => {
    return rides.filter(r => r.driver === userName).length;
  };
  const pendingVerifications = users.filter(u => u.status === 'Pending').length;

  return (
    <div className="space-y-8 relative">
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedUser.name}</h3>
                  <span className={`inline-block px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium ${
                    selectedUser.status === 'Verified' ? 'bg-green-100 text-green-800' :
                    selectedUser.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedUser.status || 'Pending'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span>{selectedUser.email}</span>
                </div>
                {selectedUser.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span>{selectedUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-gray-600">
                  <Key className="h-5 w-5 text-gray-400" />
                  <div className="flex-1 flex items-center gap-2">
                    {isEditingPassword ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input 
                          type="text" 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)} 
                          placeholder="New password"
                          className="h-8 text-sm"
                        />
                        <Button size="sm" onClick={() => {
                          updateUserPassword(selectedUser.id, newPassword);
                          setSelectedUser({ ...selectedUser, password: newPassword });
                          setIsEditingPassword(false);
                        }}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingPassword(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <span>Password: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-sm">{selectedUser.password || 'Not set'}</span></span>
                        <button onClick={() => { setIsEditingPassword(true); setNewPassword(selectedUser.password || ""); }} className="text-blue-600 hover:text-blue-800 p-1">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {selectedUser.bio && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Bio</h4>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{selectedUser.bio}</p>
                </div>
              )}

              {selectedUser.vehicles && selectedUser.vehicles.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Car className="h-5 w-5" /> Vehicles
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.vehicles.map((v: any) => (
                      <div key={v.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                        <p className="font-medium text-gray-900">{v.make} {v.model} ({v.year})</p>
                        <p className="text-gray-500">Plate: {v.licensePlate} • Color: {v.color}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedUser.emergencyContacts && selectedUser.emergencyContacts.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" /> Emergency Contacts
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.emergencyContacts.map((contact: any) => (
                      <div key={contact.id} className="bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                        <p className="font-medium text-red-900">{contact.name} ({contact.relation})</p>
                        <p className="text-red-700">{contact.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Total Rides Offered:</span> {getUserRidesCount(selectedUser.name)}
                </p>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this user?")) {
                      deleteUser(selectedUser.id);
                      setSelectedUser(null);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete User
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-2">Overview of platform metrics, verifications, and refunds.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <h3 className="text-2xl font-bold">{users.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-amber-100 text-amber-600 rounded-xl">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Verifications</p>
              <h3 className="text-2xl font-bold">{pendingVerifications}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-green-100 text-green-600 rounded-xl">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <h3 className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-purple-100 text-purple-600 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Rides</p>
              <h3 className="text-2xl font-bold">{rides.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-red-100 text-red-600 rounded-xl">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cancellations (This Week)</p>
              <h3 className="text-2xl font-bold">0</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-orange-100 text-orange-600 rounded-xl">
              <RefreshCcw className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Refunds</p>
              <h3 className="text-2xl font-bold">0</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 rounded-tl-lg">Name</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 rounded-tr-lg">Rides</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                        No users have signed up yet.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr 
                        key={user.id} 
                        className="border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setSelectedUser(user)}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">{user.name} <span className="text-gray-400 text-xs block">{user.email}</span></td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'Verified' ? 'bg-green-100 text-green-800' :
                            user.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {user.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{getUserRidesCount(user.name)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 rounded-tl-lg">User</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No recent refunds to display.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
