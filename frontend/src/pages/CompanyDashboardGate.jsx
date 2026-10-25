// frontend/src/pages/CompanyDashboardGate.jsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Route, Routes, Link, Navigate } from "react-router";
import {
  Loader2,
  ShieldAlert,
  Clock,
  ArrowLeft,
  Mail,
  FileCheck2,
} from "lucide-react";
import {
  getMyCompanyStatus,
  syncUserAuth,
  getPublicPlatformSettings,
} from "../services/api";
import { WorkspaceProvider } from "../lib/workspace-store";

import DashboardHome from "../components/companyDashboardPages/index";
import RequestsPage from "../components/companyDashboardPages/requests";
import MessagesPage from "../components/companyDashboardPages/message";
import TeamPage from "../components/companyDashboardPages/team";
import AnalyticsPage from "../components/companyDashboardPages/analytics";
import SettingsPage from "../components/companyDashboardPages/settings";
import CompanyPage from "../components/companyDashboardPages/CompanyPage";
import CompanyPageEdit from "../components/companyDashboardPages/CompanyPageEdit";

export default function CompanyDashboardGate() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState(null);
  const [memberRole, setMemberRole] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      setLoading(true);
      const token = await getToken();

      // 1. Sync authentication and assign staff role
      await syncUserAuth(token).catch(() => {});

      // 2. Fetch company status
      const company = await getMyCompanyStatus(token);

      setCompanyData(company || null);
      setStatus(company?.status || "none");
      if (company?.memberRole) {
        setMemberRole(company.memberRole);
      }
    } catch (err) {
      console.error("Gate verification error:", err.message);
      setStatus("none");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Checking company approval status...
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return <PendingVerification company={companyData} />;
  }

  if (status === "rejected") {
    return <RejectedNotice />;
  }

  // Allow verified companies as well as active staff members (including field_crew)
  const isApprovedStaff =
    ["manager", "auditor", "tester", "field_crew"].includes(memberRole) &&
    status === "verified";

  if (status === "verified" || isApprovedStaff) {
    return <CompanyDashboard memberRole={memberRole} />;
  }

  return <NoCompanyFound />;
}

function CompanyDashboard({ memberRole }) {
  const isFieldCrew = memberRole === "field_crew";

  return (
    <WorkspaceProvider>
      <Routes>
        {/* If user is Field Crew, redirect Dashboard root straight to Messages */}
        <Route
          index
          element={
            isFieldCrew ? (
              <Navigate to="/company-dashboard/messages" replace />
            ) : (
              <DashboardHome />
            )
          }
        />
        <Route path="messages" element={<MessagesPage />} />

        {/* Protect all other contractor management tabs from Field Crew */}
        <Route
          path="requests"
          element={
            isFieldCrew ? <Navigate to="/company-dashboard/messages" replace /> : <RequestsPage />
          }
        />
        <Route
          path="team"
          element={
            isFieldCrew ? <Navigate to="/company-dashboard/messages" replace /> : <TeamPage />
          }
        />
        <Route
          path="analytics"
          element={
            isFieldCrew ? <Navigate to="/company-dashboard/messages" replace /> : <AnalyticsPage />
          }
        />
        <Route
          path="settings"
          element={
            isFieldCrew ? <Navigate to="/company-dashboard/messages" replace /> : <SettingsPage />
          }
        />
        <Route
          path="company-page"
          element={
            isFieldCrew ? <Navigate to="/company-dashboard/messages" replace /> : <CompanyPage />
          }
        />
        <Route
          path="company-page-edit"
          element={
            isFieldCrew ? <Navigate to="/company-dashboard/messages" replace /> : <CompanyPageEdit />
          }
        />
      </Routes>
    </WorkspaceProvider>
  );
}

// UPGRADED PENDING SCREEN CONNECTED TO ADMIN SETTINGS
function PendingVerification({ company }) {
  const [platformSettings, setPlatformSettings] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getPublicPlatformSettings();
        setPlatformSettings(data);
      } catch (err) {
        console.warn("Failed to load platform settings:", err);
      }
    }
    loadSettings();
  }, []);

  const reviewTime = platformSettings?.reviewTime || "2–3 business days";
  const supportEmail = platformSettings?.supportEmail || "support@laborconnect.com";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-md text-center space-y-5 sm:space-y-6 animate-in fade-in duration-200">
        <div className="mx-auto flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shrink-0">
          <Clock className="size-6 sm:size-7 animate-pulse" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            Verification In Progress
          </div>
          <h1 className="mt-2.5 sm:mt-3 text-xl sm:text-2xl font-bold text-foreground">Application Under Review</h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {company?.legalName ? (
              <>
                Your company registration for <strong>{company.legalName}</strong> has been submitted and is currently in the verification queue.
              </>
            ) : (
              "Your company registration and trade credentials have been submitted and are currently in the verification queue."
            )}
          </p>
        </div>

        {/* Dynamic Admin Settings Box */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5 text-left space-y-3 sm:space-y-3.5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 sm:p-2 text-primary shrink-0">
              <Clock className="size-3.5 sm:size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Estimated Review Time</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Our verification officers typically review credentials within <strong>{reviewTime}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="mt-0.5 rounded-lg bg-emerald-500/10 p-1.5 sm:p-2 text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileCheck2 className="size-3.5 sm:size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Compliance Verification</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                We verify trade licenses, certificates of insurance (COI), and corporate registration records.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="mt-0.5 rounded-lg bg-purple-500/10 p-1.5 sm:p-2 text-purple-600 dark:text-purple-400 shrink-0">
              <Mail className="size-3.5 sm:size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">Need Urgent Assistance?</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Reach out to our platform support team at{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-medium text-primary hover:underline break-all"
                >
                  {supportEmail}
                </a>
              </p>
            </div>
          </div>
        </div>

        <div>
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4" /> Return to Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

function RejectedNotice() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-3 sm:px-4 py-6 sm:py-8 text-center overflow-x-hidden">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4">
        <div className="mx-auto flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive shrink-0">
          <ShieldAlert className="size-6 sm:size-7" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">Application Not Approved</h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Your company registration was reviewed and not approved. Please contact platform support for more details.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted cursor-pointer w-full sm:w-auto"
        >
          <ArrowLeft className="size-4" /> Return to Marketplace
        </Link>
      </div>
    </div>
  );
}

function NoCompanyFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-3 sm:px-4 py-6 sm:py-8 text-center overflow-x-hidden">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4">
        <div className="mx-auto flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shrink-0">
          <ShieldAlert className="size-6 sm:size-7" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">No Contractor Profile Found</h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            You are currently signed in as a customer. To access this workspace, register your contractor business or request an invitation from your company manager.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Link
            to="/company-registration"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer text-center"
          >
            Register a Service Company
          </Link>
          <Link
            to="/"
            className="w-full rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted cursor-pointer text-center"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}