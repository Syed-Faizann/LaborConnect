// frontend/src/components/companyDashboardPages/settings.jsx (or SettingsPage.jsx)
import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { Card, WorkspaceShell, useCompanyRole } from "../WorkspaceShell";
import { useWorkspace } from "../../lib/workspace-store";

export default function SettingsPage() {
  const { company, updateCompany, saveCompany } = useWorkspace();
  const { isTester } = useCompanyRole();
  const isReadOnly = isTester;

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const emergency = company.emergencyService || {
    enabled: false,
    title: "24/7 Emergency Service",
    description:
      "Immediate response for burst pipes, severe blockages, and critical water damage mitigation scenarios across the metro area.",
  };

  const weekend = company.weekendService || {
    enabled: false,
    title: "Weekend Service Available",
    description:
      "On-call dispatch available Saturdays, Sundays, and holidays for scheduled and urgent service.",
  };

  const handleToggleEmergency = (enabled) => {
    if (isReadOnly) return;
    updateCompany({
      emergencyService: { ...emergency, enabled },
    });
  };

  const handleToggleWeekend = (enabled) => {
    if (isReadOnly) return;
    updateCompany({
      weekendService: { ...weekend, enabled },
    });
  };

  const handleEmergencyField = (field, val) => {
    if (isReadOnly) return;
    updateCompany({
      emergencyService: { ...emergency, [field]: val },
    });
  };

  const handleWeekendField = (field, val) => {
    if (isReadOnly) return;
    updateCompany({
      weekendService: { ...weekend, [field]: val },
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isReadOnly) {
      setFeedback({ type: "error", text: "Inspector / Tester mode: Saving settings is disabled." });
      return;
    }
    try {
      setSaving(true);
      setFeedback(null);
      await saveCompany();
      setFeedback({ type: "success", text: "Settings and availability saved successfully!" });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <WorkspaceShell
      title="Settings"
      status={isReadOnly ? "Read-Only Inspection" : "Storefront Preferences"}
      actions={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || isReadOnly}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-opacity"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isReadOnly ? "Save Locked (Read-Only)" : "Save Changes"}
        </button>
      }
    >
      {feedback && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Availability & Emergency Banner Configuration */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">24/7 Emergency Banner</h2>
                <p className="text-xs text-muted-foreground">
                  Displays highlighted banner below Services on your public profile.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4 border-t border-border pt-5">
              <label
                className={`flex items-center justify-between rounded-xl border border-border bg-surface p-4 ${
                  isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                }`}
              >
                <div>
                  <span className="block text-sm font-bold">Enable 24/7 Emergency Service</span>
                  <span className="block text-xs text-muted-foreground">
                    Customers see an urgent dispatch alert box on your storefront.
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(emergency.enabled)}
                  onChange={(e) => handleToggleEmergency(e.target.checked)}
                  className="size-5 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              {emergency.enabled && (
                <div className="space-y-3 rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-500/20 dark:bg-amber-950/20">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-amber-900 dark:text-amber-200">
                      Banner Headline
                    </label>
                    <input
                      disabled={isReadOnly}
                      className={inputClass}
                      value={emergency.title}
                      onChange={(e) => handleEmergencyField("title", e.target.value)}
                      placeholder="e.g. 24/7 Emergency Service"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-amber-900 dark:text-amber-200">
                      Banner Details & Scope
                    </label>
                    <textarea
                      rows={3}
                      disabled={isReadOnly}
                      className={inputClass}
                      value={emergency.description}
                      onChange={(e) => handleEmergencyField("description", e.target.value)}
                      placeholder="e.g. Immediate response for burst pipes, severe blockages..."
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Weekend Service Banner</h2>
                <p className="text-xs text-muted-foreground">
                  Highlight Saturday & Sunday appointment scheduling.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4 border-t border-border pt-5">
              <label
                className={`flex items-center justify-between rounded-xl border border-border bg-surface p-4 ${
                  isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                }`}
              >
                <div>
                  <span className="block text-sm font-bold">Enable Weekend Service</span>
                  <span className="block text-xs text-muted-foreground">
                    Shows weekend availability badge on your storefront.
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(weekend.enabled)}
                  onChange={(e) => handleToggleWeekend(e.target.checked)}
                  className="size-5 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              {weekend.enabled && (
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold">Banner Headline</label>
                    <input
                      disabled={isReadOnly}
                      className={inputClass}
                      value={weekend.title}
                      onChange={(e) => handleWeekendField("title", e.target.value)}
                      placeholder="e.g. Weekend Service Available"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold">Banner Details</label>
                    <textarea
                      rows={2}
                      disabled={isReadOnly}
                      className={inputClass}
                      value={weekend.description}
                      onChange={(e) => handleWeekendField("description", e.target.value)}
                      placeholder="e.g. On-call technician dispatch available throughout Saturdays and Sundays."
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Live Preview Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold">Storefront Live Preview</h2>
            <p className="text-xs text-muted-foreground">
              Here is how your emergency and weekend badges appear below your services:
            </p>

            <div className="mt-5 space-y-4">
              {emergency.enabled ? (
                <div className="flex items-start gap-4 rounded-2xl border border-amber-300/80 bg-amber-50/70 p-5 shadow-xs dark:border-amber-500/30 dark:bg-amber-950/30">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-amber-950 dark:text-amber-300">
                      {emergency.title || "24/7 Emergency Service"}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-400/90">
                      {emergency.description ||
                        "Immediate response for burst pipes, severe blockages, and critical water damage scenarios."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  24/7 Emergency Banner is currently disabled.
                </div>
              )}

              {weekend.enabled ? (
                <div className="flex items-start gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-xs">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Clock className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-foreground">
                      {weekend.title || "Weekend Service Available"}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {weekend.description ||
                        "On-call dispatch available Saturdays, Sundays, and holidays for urgent service."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Weekend Service Banner is currently disabled.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </WorkspaceShell>
  );
}