// frontend/src/pages/admin/AdminOverview.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Clock3,
  DollarSign,
  HandCoins,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminShell, Card } from "../AdminShell";
import { getAdminStats, getAllCompanies, getAdminFinancialStats } from "../../services/api";

export default function AdminOverview() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, pendingCount: 0, verifiedCount: 0 });
  const [financials, setFinancials] = useState({
    totalVolume: 0,
    totalAdminRevenue: 0,
    transactionsCount: 0,
    recentTransactions: [],
  });
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const [statsData, companiesData, financeData] = await Promise.all([
          getAdminStats(token),
          getAllCompanies("pending", token),
          getAdminFinancialStats(token),
        ]);
        setStats(statsData || {});
        setPendingCompanies(Array.isArray(companiesData) ? companiesData : []);
        setFinancials(financeData || {});
      } catch (err) {
        console.error("Error loading admin overview:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    {
      label: "Platform 2% Revenue",
      value: loading
        ? "..."
        : `$${(financials.totalAdminRevenue || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      hint: "Net commission earned",
      icon: DollarSign,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Booking Volume",
      value: loading
        ? "..."
        : `$${(financials.totalVolume || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      hint: `${financials.transactionsCount || 0} paid job bookings`,
      icon: TrendingUp,
      tone: "text-primary",
    },
    {
      label: "Pending Approvals",
      value: loading ? "..." : String(stats.pendingCount || 0),
      hint: "Contractors waiting review",
      icon: Clock3,
      tone: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Verified Contractors",
      value: loading ? "..." : String(stats.verifiedCount || 0),
      hint: "Active on marketplace",
      icon: Building2,
      tone: "text-primary",
    },
  ];

  return (
    <AdminShell
      title="Admin Dashboard"
      status="Platform Master"
      actions={
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Link
            to="/admin/revenue"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold hover:bg-muted"
          >
            <HandCoins className="size-4 text-emerald-600" /> Revenue &amp; Fees
          </Link>
          <Link
            to="/admin/settings"
            className="rounded-xl bg-primary px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Platform Settings
          </Link>
        </div>
      }
    >
      {/* 4 Overview Metric Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{s.label}</p>
              <s.icon className={`size-4 ${s.tone || "text-primary"}`} />
            </div>
            <p className={`mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold tracking-tight ${s.tone || "text-foreground"}`}>
              {s.value}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
              {s.hint}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-5 sm:mt-6 grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Verification Queue (Contractor Registrations) */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-border gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold">Company Verification Queue</h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Contractors awaiting license &amp; insurance verification
              </p>
            </div>
            <Link
              to="/admin/companies"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
            >
              View all <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {loading ? (
            <p className="mt-6 text-xs text-muted-foreground">Loading queue...</p>
          ) : pendingCompanies.length === 0 ? (
            <div className="py-8 sm:py-10 text-center text-xs text-muted-foreground">
              No contractor applications currently pending review.
            </div>
          ) : (
            <div className="mt-4 space-y-2.5 sm:space-y-3">
              {pendingCompanies.slice(0, 5).map((company) => (
                <div
                  key={company._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-xl border border-border bg-surface px-3.5 sm:px-4 py-2.5 sm:py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                      {company.legalName?.slice(0, 2).toUpperCase() || "CO"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate">{company.legalName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {company.hqLocation} · {company.tradeCategories?.slice(0, 2).join(", ")}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/admin/companies"
                    className="self-end sm:self-center flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold hover:bg-muted shrink-0"
                  >
                    Review <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent 2% Platform Fee Earnings Feed */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-border gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold">Recent Paid Bookings &amp; 2% Fees</h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Real-time booking revenue &amp; platform cuts
              </p>
            </div>
            <Link
              to="/admin/revenue"
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline shrink-0"
            >
              Full Ledger <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {loading ? (
            <p className="mt-6 text-xs text-muted-foreground">Loading transactions...</p>
          ) : !financials.recentTransactions || financials.recentTransactions.length === 0 ? (
            <div className="py-8 sm:py-10 text-center text-xs text-muted-foreground">
              No paid bookings registered yet.
            </div>
          ) : (
            <div className="mt-4 space-y-2.5 sm:space-y-3">
              {financials.recentTransactions.slice(0, 5).map((tx) => (
                <div
                  key={tx._id}
                  className="flex items-start sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 sm:px-4 py-2.5 sm:py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <p className="text-xs font-bold text-foreground truncate max-w-[140px] sm:max-w-none">
                        {tx.company?.name || "Contractor"}
                      </p>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {tx.durationHours || 8}h ({tx.totalWorkers || 1}w)
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      Client: {tx.customer?.fullName || "Client"}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-xs font-bold text-foreground">
                      ${(tx.totalAmount || 0).toFixed(2)}
                    </span>
                    <span className="block text-[10px] sm:text-[11px] font-bold text-emerald-600">
                      +${(tx.adminFee || 0).toFixed(2)} (2%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}