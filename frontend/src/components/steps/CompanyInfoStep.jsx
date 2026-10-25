// frontend/src/components/steps/CompanyInfoStep.jsx
import { useRef } from "react";
import { CloudUpload } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function CompanyInfoStep({ data, onChange, settings }) {
  const fileInputRef = useRef(null);
  const allowWebsite = settings?.allowWebsite === true;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Company Information
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Let&apos;s start with the basics to set up your profile.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Company Logo</Label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/30 px-4 py-8 sm:px-6 sm:py-10 transition-colors hover:bg-muted/50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={(e) => onChange({ logoFile: e.target.files?.[0] || null })}
          />
          <CloudUpload className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
          {data.logoFile ? (
            <p className="text-xs sm:text-sm font-medium text-primary break-all text-center px-2">
              {data.logoFile.name}
            </p>
          ) : (
            <p className="text-xs sm:text-sm font-medium text-primary text-center">
              Upload a file
              <span className="text-muted-foreground"> or drag and drop</span>
            </p>
          )}
          <p className="text-[11px] sm:text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company-name">
          Legal Company Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="company-name"
          value={data.legalName}
          onChange={(e) => onChange({ legalName: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Primary Phone Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          Business Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </div>

      {allowWebsite && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <Label htmlFor="website">
            Company Website <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
          </Label>
          <Input
            id="website"
            type="url"
            value={data.website || ""}
            placeholder="https://yourcompany.com"
            onChange={(e) => onChange({ website: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}