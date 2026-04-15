/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import PostRide from "./pages/PostRide";
import RideDetail from "./pages/RideDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import { NotificationProvider } from "./contexts/NotificationContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RideProvider } from "./contexts/RideContext";
import { CommuteProvider } from "./contexts/CommuteContext";
import { ChatProvider } from "./contexts/ChatContext";
import DailyCommute from "./pages/DailyCommute";
import Profile from "./pages/Profile";
import LongTrips from "./pages/LongTrips";

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <RideProvider>
        <CommuteProvider>
          <ChatProvider>
            <NotificationProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="login" element={<Login />} />
                    <Route path="daily-commute" element={<DailyCommute />} />
                    <Route path="long-trips" element={<LongTrips />} />
                    <Route path="profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    <Route path="onboarding" element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  } />
                  <Route path="post-ride" element={
                    <ProtectedRoute>
                      <PostRide />
                    </ProtectedRoute>
                  } />
                  <Route path="ride/:id" element={<RideDetail />} />
                  <Route path="admin-portal" element={
                    <ProtectedRoute requireAdmin={true}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                </Route>
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </ChatProvider>
        </CommuteProvider>
      </RideProvider>
    </AuthProvider>
  );
}
