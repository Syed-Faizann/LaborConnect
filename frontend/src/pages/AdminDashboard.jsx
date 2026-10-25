import { Route, Routes } from "react-router";
import AdminOverview from "../components/AdminDashboard/AdminOverview";
import CompaniesPage from "../components/AdminDashboard/CompaniesPage";
import MessagesPage from "../components/AdminDashboard/MessagesPage";
import TeamPage from "../components/AdminDashboard/TeamPage";
import NotificationsPage from "../components/AdminDashboard/NotificationsPage";
import SettingsPage from "../components/AdminDashboard/SettingsPage";
import HelpCenterPage from "../components/AdminDashboard/HelpCenterPage";
import AdminRevenuePage from "../components/AdminDashboard/AdminRevenuePage"; // <-- Import the new page

export default function AdminDashboard() {
  return (
    <Routes>
      <Route index element={<AdminOverview />} />
      <Route path="companies" element={<CompaniesPage />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="team" element={<TeamPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="help" element={<HelpCenterPage />} />
      <Route path="revenue" element={<AdminRevenuePage />} /> {/* <-- Add the new route */}
    </Routes>
  );
}
