import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Navigate, Route, Routes } from "react-router";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import { CompanyRegistration } from "./pages/CompanyRegistration";
import CompanyDashboardGate from "./pages/CompanyDashboardGate";
import AdminDashboard from "./pages/AdminDashboard";
import Marketplace from "./pages/Marketplace";
import CompanyProfilePage from "./pages/CompanyProfilePage";
import SupportPage from "./pages/SupportPage";
import RequestForm from "./pages/RequestForm";
import NotificationsPage from "./pages/NotificationsPage";
import AboutPage from "./pages/AboutPage";
import CustomerMessagesPage from "./pages/MessagesPage";

import { setAxiosAuthToken } from "./lib/axios";
import { useAuthStore } from "./store/useAuthStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [dbUser, setDbUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");
  const { connectSocket, disconnectSocket } = useAuthStore();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUserLoading(false);
      disconnectSocket();
      return;
    }

    async function syncUser() {
      setUserLoading(true);
      try {
        const token = await getToken();
        setAxiosAuthToken(token);

        const res = await fetch(`${API_URL}/api/auth/sync`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Sync failed");

        setDbUser(data);
        // Save both authUser and dbUser so Navbar can access it globally
        useAuthStore.setState({ authUser: data, dbUser: data });
        connectSocket(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setUserLoading(false);
      }
    }

    syncUser();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return null;

  return (
    <div>
      <Routes>
        {/* If Super Admin logs in, auto-redirect to /admin instead of the customer home page */}
        <Route
          path="/"
          element={
            !isSignedIn ? (
              <Navigate to="/auth" replace />
            ) : dbUser?.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <HomePage dbUser={dbUser} authError={error} />
            )
          }
        />

        <Route path="/messages" element={isSignedIn ? <CustomerMessagesPage dbUser={dbUser} /> : <Navigate to="/auth" />} />
        <Route path="/notifications" element={<NotificationsPage dbUser={dbUser} />} />
        <Route path="/auth" element={!isSignedIn ? <AuthPage /> : <Navigate to="/" replace />} />
        <Route path="/company-registration" element={isSignedIn ? <CompanyRegistration /> : <Navigate to="/auth" />} />
        <Route path="/marketplace" element={<Marketplace dbUser={dbUser} />} />
        <Route path="/requestform" element={<RequestForm dbUser={dbUser} />} />
        <Route path="/companies/:companyId" element={<CompanyProfilePage dbUser={dbUser} />} />
        <Route path="/support" element={<SupportPage dbUser={dbUser} />} />
        
        {/* FIXED: Now passes dbUser */}
        <Route path="/about" element={<AboutPage dbUser={dbUser} />} />
        
        <Route
          path="/company-dashboard/*"
          element={isSignedIn ? <CompanyDashboardGate /> : <Navigate to="/auth" replace />}
        />

        <Route
          path="/admin/*"
          element={
            !isSignedIn ? (
              <Navigate to="/auth" replace />
            ) : userLoading ? (
              <p className="p-8 text-center">Loading...</p>
            ) : dbUser?.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<p className="p-8 text-center">Page not found.</p>} />
      </Routes>
    </div>
  );
}

export default App;