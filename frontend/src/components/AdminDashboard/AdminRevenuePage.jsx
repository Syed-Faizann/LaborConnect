// frontend/src/pages/admin/AdminRevenuePage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  DollarSign,
  TrendingUp,
  Building2,
  Loader2,
} from "lucide-react";
import { AdminShell, Card } from "../AdminShell";
import { getAdminFinancialStats } from "../../services/api";

export default function AdminRevenuePage() {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const token = await getToken();
        const res = await getAdminFinancialStats(token);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <AdminShell title="Platform Financials" status="Loading...">
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Loading revenue and commission data...
        </div>
      </AdminShell>
    );
  }

  const maxRevenue = Math.max(
    ...(data?.companyChartData?.map((c) => c.totalProcessed) || [1]),
    1
  );

  return (
    <AdminShell title="Revenue & Commissions" status="2% Platform Fee Active">
      {/* 3 Metric Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Admin 2% Revenue</span>
            <DollarSign className="size-5 text-emerald-600 shrink-0" />
          </div>
          <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-foreground">
            ${(data?.totalAdminRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Net platform commission collected</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Booking Volume</span>
            <TrendingUp className="size-5 text-primary shrink-0" />
          </div>
          <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-foreground">
            ${(data?.totalVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Gross value across {data?.transactionsCount || 0} jobs</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Company Payouts (98%)</span>
            <Building2 className="size-5 text-blue-600 shrink-0" />
          </div>
          <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-foreground">
            ${(data?.totalCompanyPayouts || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Disbursed to service companies</p>
        </Card>
      </div>

      {/* Visual Bar Chart: Which company processed and paid what */}
      <Card className="mt-5 sm:mt-6 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold">Company Revenue &amp; 2% Fee Breakdown</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Volume generated per company and corresponding platform commissions.
        </p>

        <div className="mt-5 sm:mt-6 space-y-4">
          {data?.companyChartData?.map((item) => {
            const barWidthPercent = Math.min(100, Math.round((item.totalProcessed / maxRevenue) * 100));
            return (
              <div key={item.name} className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-bold text-foreground truncate">
                    {item.name} ({item.jobsCount} {item.jobsCount === 1 ? "job" : "jobs"})
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="text-muted-foreground">Total: ${item.totalProcessed.toFixed(2)}</span>
                    <span className="font-bold text-emerald-600">2% Fee: ${item.adminFeePaid.toFixed(2)}</span>
                  </div>
                </div>
                <div className="h-2.5 sm:h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${barWidthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
          {(!data?.companyChartData || data.companyChartData.length === 0) && (
            <p className="text-center text-xs sm:text-sm text-muted-foreground py-6">No paid bookings processed yet.</p>
          )}
        </div>
      </Card>

      {/* Recent Transactions List */}
      <Card className="mt-5 sm:mt-6 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold">Recent Payment Transactions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground uppercase text-[10px] sm:text-xs">
              <tr>
                <th className="pb-3 pr-3 font-semibold">Client</th>
                <th className="pb-3 pr-3 font-semibold">Company</th>
                <th className="pb-3 pr-3 font-semibold">Work Hours</th>
                <th className="pb-3 pr-3 font-semibold">Gross Total</th>
                <th className="pb-3 pr-3 font-semibold text-emerald-600">Admin 2% Cut</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.recentTransactions?.map((tx) => (
                <tr key={tx._id} className="py-2 hover:bg-muted/40 transition-colors">
                  <td className="py-3 pr-3 font-semibold text-foreground whitespace-nowrap">{tx.customer?.fullName || "Customer"}</td>
                  <td className="py-3 pr-3 text-muted-foreground whitespace-nowrap">{tx.company?.name || "Company"}</td>
                  <td className="py-3 pr-3 text-muted-foreground whitespace-nowrap">{tx.durationHours || 8} hrs ({tx.totalWorkers || 1} workers)</td>
                  <td className="py-3 pr-3 font-bold text-foreground whitespace-nowrap">${(tx.totalAmount || 0).toFixed(2)}</td>
                  <td className="py-3 pr-3 font-bold text-emerald-600 whitespace-nowrap">+${(tx.adminFee || 0).toFixed(2)}</td>
                  <td className="py-3 whitespace-nowrap">
                    <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}