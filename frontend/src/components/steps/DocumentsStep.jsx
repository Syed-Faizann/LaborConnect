// frontend/src/components/steps/DocumentsStep.jsx
import { useRef } from "react";
import { Upload, FileText, X, Shield, Calendar } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";

export function DocumentsStep({ data, onChange, settings }) {
  const licenseInputRef = useRef(null);
  const coiInputRef = useRef(null);

  const isLicenseRequired = settings?.requireTradeLicense !== false;
  const isInsuranceRequired = settings?.requireInsurance !== false;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Documents &amp; Compliance
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Upload state trade licenses and insurance certificates for platform verification.
        </p>
      </div>

      {/* 1. TRADE LICENSE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide">
            1. Business Trade License / Master License
          </Label>
          {isLicenseRequired ? (
            <Badge variant="destructive" className="text-[10px]">Required</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
          )}
        </div>

        {data.tradeLicenseFile ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">{data.tradeLicenseFile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(data.tradeLicenseFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ tradeLicenseFile: null })}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => licenseInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/30 px-4 py-6 sm:px-6 sm:py-8 transition-colors hover:bg-muted/50"
          >
            <input
              ref={licenseInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => onChange({ tradeLicenseFile: e.target.files?.[0] || null })}
            />
            <Upload className="size-6 sm:size-7 text-muted-foreground" />
            <p className="text-xs sm:text-sm font-medium text-primary text-center">
              Upload License <span className="text-muted-foreground">or drag &amp; drop</span>
            </p>
            <p className="text-[11px] text-muted-foreground">PDF or scanned images up to 10MB</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>License Number</Label>
            <Input
              value={data.licenseNumber}
              onChange={(e) => onChange({ licenseNumber: e.target.value })}
              placeholder="e.g. MP-7890214-8"
            />
          </div>
          <div className="space-y-2">
            <Label>Expiration Date</Label>
            <div className="relative">
              <Input
                value={data.licenseExpiration}
                onChange={(e) => onChange({ licenseExpiration: e.target.value })}
                placeholder="MM/DD/YYYY"
              />
              <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROOF OF INSURANCE (COI) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide">
            2. General Liability Insurance Certificate (COI)
          </Label>
          {isInsuranceRequired ? (
            <Badge variant="destructive" className="text-[10px]">Required (Min $1,000,000)</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
          )}
        </div>

        {data.coiFile ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">{data.coiFile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(data.coiFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ coiFile: null })}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => coiInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/30 px-4 py-6 sm:px-6 sm:py-8 transition-colors hover:bg-muted/50"
          >
            <input
              ref={coiInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => onChange({ coiFile: e.target.files?.[0] || null })}
            />
            <Upload className="size-6 sm:size-7 text-muted-foreground" />
            <p className="text-xs sm:text-sm font-medium text-primary text-center">
              Upload COI Certificate <span className="text-muted-foreground">or drag &amp; drop</span>
            </p>
            <p className="text-[11px] text-muted-foreground">PDF or scanned images up to 10MB</p>
          </div>
        )}
      </div>

      {/* 3. WORKERS COMP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide">
            3. Workers&apos; Compensation Policy
          </Label>
          <Badge variant="secondary" className="text-[10px]">Required if crew &gt; 1</Badge>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 sm:p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              checked={data.workersCompExempt}
              onCheckedChange={(checked) => onChange({ workersCompExempt: checked === true })}
            />
            <span className="text-xs sm:text-sm text-foreground">
              Exempt from Workers&apos; Comp{" "}
              <span className="text-muted-foreground block sm:inline">(Sole Proprietor / No non-owner crew)</span>
            </span>
          </label>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-primary/5 p-3.5 sm:p-4 transition-colors">
        <Checkbox
          checked={data.certify}
          onCheckedChange={(checked) => onChange({ certify: checked === true })}
          className="mt-0.5"
        />
        <span className="text-xs sm:text-sm text-foreground leading-relaxed">
          I certify under penalty of perjury that all provided documentation is authentic, active, bonded, and meets municipal and state licensing regulations.
        </span>
      </label>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="size-4 shrink-0 text-emerald-600" />
        <span>Bank-grade 256-bit encrypted storage</span>
      </div>
    </div>
  );
}