import React, { useState, useRef, useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { Car, User, ShieldCheck, Bell, LogOut, LogIn, Github, Twitter, Facebook, Instagram, Menu, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { getCurrentLocation } from "../lib/locationUtils";

export default function Layout() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { notifications, markAllAsRead, clearNotifications } = useNotifications();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationRef = useRef<HTMLDivElement>(null);

  const [locationPermission, setLocationPermission] = useState<PermissionState | 'unsupported'>('prompt');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    // Request location permission immediately on app startup
    const triggerNativePrompt = () => {
      if ("geolocation" in navigator) {
        // Direct call to ensure browser triggers the prompt
        navigator.geolocation.getCurrentPosition(
          () => setLocationPermission('granted'),
          (err) => {
            if (err.code === 1) setLocationPermission('denied');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    };

    // Check and request location permission
    if ("geolocation" in navigator) {
      if ("permissions" in navigator) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(status => {
          setLocationPermission(status.state);
          if (status.state === 'prompt') {
            triggerNativePrompt();
          }
          status.onchange = () => setLocationPermission(status.state);
        });
      } else {
        // Fallback for browsers that don't support permissions API
        triggerNativePrompt();
      }

      // Also run our utility for data fetching
      getCurrentLocation(true, 10000)
        .then(() => setLocationPermission('granted'))
        .catch(() => {});
    } else {
      setLocationPermission('unsupported');
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const requestPermission = async () => {
    toast.loading("Requesting location access...", { id: "perm-request" });
    try {
      await getCurrentLocation();
      setLocationPermission('granted');
      toast.success("Location access granted!", { id: "perm-request" });
    } catch (error: any) {
      if (error.code === 1) { // PERMISSION_DENIED
        setLocationPermission('denied');
        toast.error("Location access denied. Please enable it in your browser settings.", { id: "perm-request" });
      } else {
        toast.error("Could not get location. Please try again.", { id: "perm-request" });
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" richColors />
      
      {locationPermission === 'denied' && (
        <div className="bg-amber-50 border-b border-amber-100 py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Location access is blocked. Please click the <strong>Lock icon 🔒</strong> in your address bar to allow access for live rides.</span>
            </div>
          </div>
        </div>
      )}

      {locationPermission === 'prompt' && (
        <div className="bg-blue-600 py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white text-sm">
              <Car className="h-4 w-4" />
              <span>Ghumoo works best with your location. Enable it for a better experience.</span>
            </div>
            <button 
              onClick={requestPermission}
              className="bg-white text-blue-600 text-xs font-bold px-3 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              Enable Location
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-[9999]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <button 
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">Ghumoo</span>
              </Link>
            </div>
            <nav className="hidden md:flex gap-6 items-center">
              <Link to="/" className="text-sm font-medium text-gray-600 hover:text-blue-600">Find Daily Commute</Link>
              <Link to="/post-ride" className="text-sm font-medium text-gray-600 hover:text-blue-600">Post a Ride</Link>
              <Link to="/daily-commute" className="text-sm font-medium text-gray-600 hover:text-blue-600">Live Rides</Link>
              <Link to="/long-trips" className="text-sm font-medium text-gray-600 hover:text-blue-600">Long Trips</Link>
              {isAdmin && (
                <Link to="/admin-portal" className="text-sm font-medium text-gray-600 hover:text-blue-600">Admin</Link>
              )}
            </nav>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/onboarding" 
                    className={`flex items-center gap-2 text-sm font-medium px-2 py-1 rounded-md transition-colors ${
                      user?.status === 'Verified'
                        ? 'text-green-600 bg-green-50 hover:bg-green-100'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {user?.status === 'Verified' ? 'Verified' : 'Verify Profile'}
                    </span>
                  </Link>
                  
                  <div className="relative" ref={notificationRef}>
                    <button 
                      onClick={() => {
                        setShowNotifications(!showNotifications);
                        if (!showNotifications) markAllAsRead();
                      }}
                      className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                      )}
                    </button>
                    
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                          <h3 className="font-semibold">Notifications</h3>
                          <button 
                            onClick={() => clearNotifications()}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">No new notifications</div>
                          ) : (
                            notifications.map(n => (
                              <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                                <p className="text-sm text-gray-800">{n.text}</p>
                                <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pl-2 border-l">
                    <Link to="/profile" className="flex items-center gap-3 hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                      <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium text-gray-900 leading-none">{user?.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{user?.role === 'admin' ? 'Admin' : 'User'}</p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Logout"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </>
              ) : (
                <Link to="/login" className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
                  <LogIn className="h-4 w-4" />
                  <span>Login / Sign Up</span>
                </Link>
              )}
            </div>
          </div>
          
          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-4 space-y-4">
              <nav className="flex flex-col gap-4 px-2">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-blue-600 px-2">Find Daily Commute</Link>
                <Link to="/post-ride" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-blue-600 px-2">Post a Ride</Link>
                <Link to="/daily-commute" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-blue-600 px-2">Live Rides</Link>
                <Link to="/long-trips" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-blue-600 px-2">Long Trips</Link>
                {isAdmin && (
                  <Link to="/admin-portal" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-blue-600 px-2">Admin</Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Car className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">Ghumoo</span>
              </Link>
              <p className="text-sm text-gray-500">
                Your trusted platform for intercity carpooling. Save money, meet new people, and reduce your carbon footprint.
              </p>
              <div className="flex gap-4 pt-2">
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Twitter className="h-5 w-5" /></a>
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Facebook className="h-5 w-5" /></a>
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Instagram className="h-5 w-5" /></a>
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Github className="h-5 w-5" /></a>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">About</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-blue-600 transition-colors">How it works</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Help Centre</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Press</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms and Conditions</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Ghumoo. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Made with ❤️ by Md Nasir Hussain </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
