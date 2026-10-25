// frontend/src/pages/company/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Calendar,
  CalendarClock,
  DollarSign,
  Eye,
  HandCoins,
  Inbox,
  Info,
  Loader2,
  Plus,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import { Card, WorkspaceShell, useCompanyRole } from "../WorkspaceShell";
import { useWorkspace, initials } from "../../lib/workspace-store";
import { getMyCompanyRequests } from "../../services/api";

export default function Dashboard() {
  const { getToken } = useAuth();
  const { isTester } = useCompanyRole();
  const { crew, company, refetch } = useWorkspace();
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    refetch?.();
    async function loadRequests() {
      try {
        setLoadingRequests(true);
        const token = await getToken();
        const list = await getMyCompanyRequests(token);
        setRequests(Array.isArray(list) ? list : []);
      } catch (_) {
      } finally {
        setLoadingRequests(false);
      }
    }
    loadRequests();
  }, [refetch]);

  const profileViews = company.views || 0;
  const isPublished = Boolean(company.published);
  const pendingRequests = requests.filter((r) => r.status === "pending");

  // Filter requests that are active/completed/paid
  const billableRequests = useMemo(() => {
    return requests.filter((r) => r.status !== "declined");
  }, [requests]);

  // Financial Calculations: 98% Company Payout & 2% Admin Fee
  const financials = useMemo(() => {
    const grossTotal = billableRequests.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const netReceived = billableRequests.reduce((sum, r) => {
      if (r.companyPayout) return sum + r.companyPayout;
      // Fallback calculation: 98%
      const gross = r.totalAmount || 0;
      return sum + (gross - gross * 0.02);
    }, 0);
    const adminFeeDue = billableRequests.reduce((sum, r) => {
      if (r.adminFee) return sum + r.adminFee;
      // Fallback calculation: 2%
      return sum + (r.totalAmount || 0) * 0.02;
    }, 0);

    return {
      grossTotal,
      netReceived,
      adminFeeDue,
      jobsCount: billableRequests.length,
    };
  }, [billableRequests]);

  // Current Month settlement date (e.g. End of Month)
  const settlementDueDate = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, []);

  const stats = [
    {
      label: "Net Received (98%)",
      value: `$${financials.netReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      hint: "Your total earned payout",
      icon: Wallet,
      tone: "text-emerald-600",
    },
    {
      label: "Fee to Send Admin (2%)",
      value: `$${financials.adminFeeDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      hint: `Settlement due ${settlementDueDate}`,
      icon: HandCoins,
      tone: "text-amber-600",
    },
    {
      label: "Pending Inquiries",
      value: String(pendingRequests.length),
      hint: "Requires company review",
      icon: Inbox,
      tone: "text-primary",
    },
    {
      label: "Storefront Views",
      value: profileViews.toLocaleString(),
      hint: isPublished ? "Live marketplace visits" : "Draft (not listed)",
      icon: Eye,
      tone: "text-primary",
    },
  ];

  return (
    <WorkspaceShell
      title="Dashboard"
      status={isPublished ? "Published • Visible to Customers" : "Draft"}
      actions={
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Link
            to="/company-dashboard/requests"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-colors hover:bg-muted shrink-0"
          >
            <Inbox className="size-3.5 sm:size-4 text-primary" />
            <span>
              <span className="hidden xs:inline">View </span>Requests ({pendingRequests.length})
            </span>
          </Link>

          {!isTester ? (
            <Link
              to="/company-dashboard/company-page-edit"
              className="rounded-xl bg-primary px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 shrink-0"
            >
              Edit Company Page
            </Link>
          ) : (
            <Link
              to="/company-dashboard/company-page"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-colors hover:bg-muted shrink-0"
            >
              <Eye className="size-3.5 sm:size-4 text-primary" /> Inspect Storefront
            </Link>
          )}
        </div>
      }
    >
      {/* 4 Core Metric Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{s.label}</p>
              <s.icon className={`size-4 ${s.tone}`} />
            </div>
            <p className={`mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold tracking-tight ${s.tone}`}>{s.value}</p>
            <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground">{s.hint}</p>
          </Card>
        ))}
      </div>

      {/* MONTHLY SETTLEMENT NOTICE BANNER */}
      <div className="mt-5 sm:mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="rounded-xl bg-amber-100 p-2 sm:p-2.5 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shrink-0 mt-0.5">
              <Receipt className="size-4.5 sm:size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-foreground">Monthly Platform Fee Settlement</h3>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                  2% Admin Commission
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Per platform policy, a 2% fee is calculated on completed bookings. You have accumulated{" "}
                <strong className="text-foreground">${financials.adminFeeDue.toFixed(2)}</strong> payable to LaborConnect
                administration by <strong>{settlementDueDate}</strong>.
              </p>
            </div>
          </div>

          <div className="flex self-end sm:self-auto shrink-0 items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground block">Amount Due to Admin</span>
              <span className="text-base sm:text-lg font-extrabold text-amber-700 dark:text-amber-400">
                ${financials.adminFeeDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 sm:mt-6 grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent Incoming Requests & Earnings Breakdown */}
        <Card className="p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between pb-1 sm:pb-0 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold">Recent Inquiries &amp; Bookings</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Recent jobs with received payout and 2% fee.</p>
            </div>
            <Link
              to="/company-dashboard/requests"
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:underline shrink-0"
            >
              See All <ArrowUpRight className="size-3.5 sm:size-4" />
            </Link>
          </div>

          <div className="mt-4 sm:mt-5 space-y-2.5 sm:space-y-3">
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading inquiries...
              </div>
            ) : requests.slice(0, 5).map((r) => {
              const servicesDisplay =
                r.services && r.services.length > 0
                  ? r.services.map((s) => `${s.name} (${s.workers || 1}w)`).join(", ")
                  : r.service;

              const gross = r.totalAmount || 0;
              const netPayout = r.companyPayout || gross * 0.98;
              const fee = r.adminFee || gross * 0.02;

              return (
                <div key={r._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs sm:text-sm truncate">{r.title}</p>
                      <span className="rounded-md bg-muted px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide shrink-0">
                        {r.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-semibold text-primary truncate">{servicesDisplay}</p>

                    <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground truncate">
                      {r.customer?.fullName || "Customer"} · {r.date} at {r.time} · {r.city}
                    </p>
                  </div>

                  {/* Financial Breakdown per Job */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t sm:border-t-0 border-border/60 pt-2.5 sm:pt-0 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-muted-foreground block">
                        Net: <strong className="text-emerald-600">${netPayout.toFixed(2)}</strong>
                      </span>
                      <span className="text-[10px] text-amber-600 font-medium block">
                        Admin Fee (2%): ${fee.toFixed(2)}
                      </span>
                    </div>

                    <Link
                      to="/company-dashboard/requests"
                      className="rounded-lg bg-card border border-border px-2.5 sm:px-3 py-1.5 text-xs font-semibold hover:bg-muted shrink-0"
                    >
                      {isTester ? "Inspect" : "Manage"}
                    </Link>
                  </div>
                </div>
              );
            })}
            {!loadingRequests && requests.length === 0 && (
              <p className="text-xs sm:text-sm text-muted-foreground py-6 text-center">No service requests received yet.</p>
            )}
          </div>
        </Card>

        {/* Financial Monthly Summary Box & Crew */}
        <div className="space-y-5 sm:space-y-6">
          <Card className="p-4 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold">
              <DollarSign className="size-4 text-emerald-600" /> Current Month Summary
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Financial breakdown for this cycle</p>

            <div className="mt-3.5 sm:mt-4 space-y-2.5 sm:space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Gross Booking Volume</span>
                <span className="font-bold">${financials.grossTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Your Net Earnings (98%)</span>
                <span className="font-bold text-emerald-600">${financials.netReceived.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Payable to Admin (2%)</span>
                <span className="font-bold text-amber-600">${financials.adminFeeDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 pt-2 font-bold text-foreground">
                <span>Total Billable Jobs</span>
                <span>{financials.jobsCount}</span>
              </div>
            </div>
          </Card>

          {/* Crew Roster Widget */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold">
                <Users className="size-4 text-primary" /> Crew Roster
              </h2>
              {!isTester ? (
                <Link to="/company-dashboard/team" className="text-xs font-semibold text-primary hover:underline">
                  <Plus className="size-3.5 inline" /> Add Pro
                </Link>
              ) : (
                <Link to="/company-dashboard/team" className="text-xs font-semibold text-muted-foreground hover:underline">
                  View Roster
                </Link>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{crew.length} active technicians on roster.</p>

            <div className="mt-3.5 sm:mt-4 space-y-2.5 sm:space-y-3">
              {crew.slice(0, 3).map((m) => (
                <div key={m._id} className="flex items-center gap-3">
                  <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{m.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{m.role}</p>
                  </div>
                </div>
              ))}
              {crew.length === 0 && <p className="text-xs text-muted-foreground">No crew members yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </WorkspaceShell>
  );
}