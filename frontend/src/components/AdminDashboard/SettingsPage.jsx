// frontend/src/components/AdminDashboard/SettingsPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Check,
  CheckSquare,
  FileCheck2,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell, useAdminRole } from "../AdminShell";
import { getAdminSettings, updateAdminSettings } from "../../services/api";

// Master list of available industry trade services
const DEFAULT_ALL_SERVICES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "HVAC",
  "Painting",
  "Cleaning",
  "Gardner",
  "Landscaping",
  "Roofing",
  "Construction & General Labor",
  "Flooring & Tiling",
  "Masonry & Concrete",
  "Demolition & Cleanup",
  "Handyman & Repairs",
  "Welding & Fabrication",
  "Pest Control",
  "Solar & Renewable Energy",
  "Locksmith & Security",
  "Pool & Spa Maintenance",
];

function Switch({ checked = false, onChange, disabled = false, "aria-label": ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({ title, description, checked = true, onChange, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-3 sm:gap-5 border-b border-border py-4 sm:py-5 last:border-0">
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">{title}</p>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} aria-label={title} />
    </div>
  );
}

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { canManageSettings, isTester } = useAdminRole();
  const isReadOnly = isTester || !canManageSettings;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Master catalog of all available service options
  const [allServicesCatalog, setAllServicesCatalog] = useState(DEFAULT_ALL_SERVICES);

  const [settings, setSettings] = useState({
    formTitle: "Register your service company",
    supportEmail: "support@laborconnect.com",
    reviewTime: "2–3 business days",
    intro: "Tell us about your company and the services you provide.",
    requireEin: true,
    requireInsurance: true,
    requireServiceArea: true,
    requireTradeLicense: true,
    allowWebsite: false,
    manualReview: true,
    emailConfirmation: true,
    expiryAlerts: true,
    acceptRegistrations: true,
    categories: ["Electrical", "Cleaning", "Carpentry", "Gardner"],
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await getAdminSettings(token);
      if (data) {
        setSettings(data);
        if (data.categories?.length) {
          setAllServicesCatalog((prev) => Array.from(new Set([...prev, ...data.categories])));
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  // Toggle a service on/off (check/uncheck)
  const toggleCategory = (catName) => {
    if (isReadOnly) return;
    setSettings((prev) => {
      const isSelected = prev.categories.some(
        (c) => c.toLowerCase().trim() === catName.toLowerCase().trim()
      );
      return {
        ...prev,
        categories: isSelected
          ? prev.categories.filter((c) => c.toLowerCase().trim() !== catName.toLowerCase().trim())
          : [...prev.categories, catName],
      };
    });
  };

  const handleSelectAll = () => {
    if (isReadOnly) return;
    setSettings((prev) => ({ ...prev, categories: [...allServicesCatalog] }));
  };

  const handleDeselectAll = () => {
    if (isReadOnly) return;
    setSettings((prev) => ({ ...prev, categories: [] }));
  };

  const handleAddCustomCategory = () => {
    if (isReadOnly) return;
    const val = newCategory.trim();
    if (!val) return;

    setAllServicesCatalog((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.includes(val) ? prev.categories : [...prev.categories, val],
    }));
    setNewCategory("");
  };

  async function handleSave() {
    if (isReadOnly) {
      toast.error("Inspector / Tester mode: Saving is disabled.");
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();

      const { _id, __v, createdAt, updatedAt, ...payload } = settings;

      await updateAdminSettings(payload, token);
      toast.success("Settings saved! Available services updated across the platform.");
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Settings" status="Loading...">
        <div className="flex items-center justify-center p-16 text-sm text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading settings...
        </div>
      </AdminShell>
    );
  }

  const filteredCatalog = allServicesCatalog.filter((cat) =>
    cat.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const inputClass =
    "w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs sm:text-sm outline-none transition focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <AdminShell
      title="Settings"
      status={isReadOnly ? "Read-Only Inspection" : "Platform Configuration"}
    >
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-7">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-primary">Administration</p>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Platform &amp; Trade Settings
          </h2>
          <p className="mt-1.5 sm:mt-2 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Check or uncheck services to control what contractors can offer on their storefronts.
          </p>
        </div>

        <div className="grid gap-5 sm:gap-7 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          
          {/* Main Configuration Pane */}
          <div className="space-y-5 sm:space-y-7">
            
            {/* General Section */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border p-4 sm:p-5 md:px-6">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <SlidersHorizontal className="size-4.5 sm:size-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold">General Details</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Customise the form shown to prospective companies.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:gap-5 p-4 sm:p-5 sm:grid-cols-2 md:p-6">
                <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
                  <label className="text-xs font-semibold">Form Title</label>
                  <input
                    disabled={isReadOnly}
                    className={inputClass}
                    value={settings.formTitle}
                    onChange={(e) => setSettings({ ...settings, formTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs font-semibold">Support Email</label>
                  <input
                    disabled={isReadOnly}
                    className={inputClass}
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs font-semibold">Estimated Review Time</label>
                  <input
                    disabled={isReadOnly}
                    className={inputClass}
                    value={settings.reviewTime}
                    onChange={(e) => setSettings({ ...settings, reviewTime: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {/* Verification Fields Section */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border p-4 sm:p-5 md:px-6">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileCheck2 className="size-4.5 sm:size-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold">Required Verification Fields</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Mandatory requirements before a contractor application can be submitted.
                  </p>
                </div>
              </div>
              <div className="px-4 sm:px-5 md:px-6">
                <SettingRow
                  title="Business Registration Number (EIN)"
                  description="Require a valid government-issued EIN or tax number."
                  checked={settings.requireEin}
                  disabled={isReadOnly}
                  onChange={(v) => setSettings({ ...settings, requireEin: v })}
                />
                <SettingRow
                  title="Proof of Insurance (COI)"
                  description="Companies must upload current general liability insurance."
                  checked={settings.requireInsurance}
                  disabled={isReadOnly}
                  onChange={(v) => setSettings({ ...settings, requireInsurance: v })}
                />
                <SettingRow
                  title="Trade License"
                  description="Request a municipal or state trade master license."
                  checked={settings.requireTradeLicense}
                  disabled={isReadOnly}
                  onChange={(v) => setSettings({ ...settings, requireTradeLicense: v })}
                />
                <SettingRow
                  title="Company Website"
                  description="Allow companies to provide an external link."
                  checked={settings.allowWebsite}
                  disabled={isReadOnly}
                  onChange={(v) => setSettings({ ...settings, allowWebsite: v })}
                />
              </div>
            </section>
          </div>

          {/* Right Sidebar: Check/Uncheck Services & Registration Toggle */}
          <aside className="space-y-4 sm:space-y-5">
            
            {/* SERVICE CATEGORIES WITH CHECKBOXES */}
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold">Available Trade Services</h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Checked services will show on contractor edit pages.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary shrink-0">
                  {settings.categories.length} Active
                </span>
              </div>

              {/* Quick Search & Select All */}
              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card pl-8 pr-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isReadOnly}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer shrink-0"
                  title="Select All"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={isReadOnly}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer shrink-0"
                  title="Deselect All"
                >
                  None
                </button>
              </div>

              {/* CHECKBOX LIST */}
              <div className="mt-3 max-h-64 sm:max-h-72 overflow-y-auto space-y-1 pr-1">
                {filteredCatalog.map((serviceName) => {
                  const isChecked = settings.categories.some(
                    (c) => c.toLowerCase().trim() === serviceName.toLowerCase().trim()
                  );

                  return (
                    <label
                      key={serviceName}
                      onClick={() => toggleCategory(serviceName)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer select-none ${
                        isChecked
                          ? "bg-primary/10 border border-primary/30 text-foreground"
                          : "bg-muted/40 border border-transparent text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`grid size-4 shrink-0 place-items-center rounded ${
                            isChecked
                              ? "bg-primary text-primary-foreground"
                              : "border border-muted-foreground/40 bg-card"
                          }`}
                        >
                          {isChecked && <Check className="size-3 stroke-[3]" />}
                        </div>
                        <span className="truncate font-semibold">{serviceName}</span>
                      </div>

                      <span
                        className={`text-[10px] font-bold shrink-0 ${
                          isChecked ? "text-primary" : "text-muted-foreground/60"
                        }`}
                      >
                        {isChecked ? "Active" : "Hidden"}
                      </span>
                    </label>
                  );
                })}

                {filteredCatalog.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No services found matching "{searchQuery}"
                  </p>
                )}
              </div>

              {/* Add Custom Service to catalog */}
              {!isReadOnly && (
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <input
                    placeholder="Add other service..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCustomCategory()}
                    className="flex-1 rounded-lg border border-input bg-card px-3 py-1.5 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer shrink-0"
                  >
                    <Plus className="size-3.5" /> Add
                  </button>
                </div>
              )}
            </section>

            {/* REGISTRATION QUEUE TOGGLE */}
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <p className="text-[10px] sm:text-xs font-semibold text-primary uppercase">Registration Queue</p>
              <p className="mt-1 text-base sm:text-lg font-bold">
                {settings.acceptRegistrations ? "Open to New Companies" : "Registrations Paused"}
              </p>
              <div className="mt-3.5 sm:mt-4 flex items-center justify-between">
                <span className="text-xs font-medium">Accept new submissions</span>
                <Switch
                  checked={settings.acceptRegistrations}
                  disabled={isReadOnly}
                  onChange={(v) => setSettings({ ...settings, acceptRegistrations: v })}
                />
              </div>
            </section>

            <button
              onClick={handleSave}
              disabled={saving || isReadOnly}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-opacity"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isReadOnly ? (
                "Save Disabled (Read-Only Mode)"
              ) : (
                "Save Changes"
              )}
            </button>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}