// frontend/src/components/steps/BusinessDetailsStep.jsx
import { MapPin, Calendar, Building2 } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../../lib/util";

const employeeRanges = ["1-5", "6-20", "21-50", "50+"];

const COUNTRIES = [
  "Pakistan",
  "United States",
  "United Kingdom",
  "Canada",
  "United Arab Emirates",
  "Saudi Arabia",
  "Australia",
  "Germany",
  "France",
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Austria",
  "Bahrain",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Chile",
  "China",
  "Colombia",
  "Czech Republic",
  "Denmark",
  "Egypt",
  "Finland",
  "Greece",
  "Hong Kong",
  "Hungary",
  "India",
  "Indonesia",
  "Ireland",
  "Italy",
  "Japan",
  "Jordan",
  "Kuwait",
  "Lebanon",
  "Malaysia",
  "Mexico",
  "Morocco",
  "Netherlands",
  "New Zealand",
  "Norway",
  "Oman",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "Ukraine",
  "Vietnam",
];

export function BusinessDetailsStep({ data, onChange, settings }) {
  const isEinRequired = settings?.requireEin !== false;

  const handleAddressChange = (patch) => {
    const updated = { ...data, ...patch };
    const street = patch.mainAddress !== undefined ? patch.mainAddress : updated.mainAddress || "";
    const city = patch.city !== undefined ? patch.city : updated.city || "";
    const state = patch.state !== undefined ? patch.state : updated.state || "";
    const country = patch.country !== undefined ? patch.country : updated.country || "Pakistan";

    const combinedHq = [street, city, state, country].filter(Boolean).join(", ");
    onChange({ ...patch, hqLocation: combinedHq });
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Business Details
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Provide your business registration, team capacity, and headquarters address.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="entity-type">
          Business Entity Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={data.entityType}
          onValueChange={(value) => onChange({ entityType: value })}
        >
          <SelectTrigger id="entity-type">
            <SelectValue placeholder="Select entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="llc">Limited Liability Company (LLC)</SelectItem>
            <SelectItem value="corp">Corporation</SelectItem>
            <SelectItem value="partnership">Partnership</SelectItem>
            <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ein">
            Federal Tax ID (EIN){" "}
            {isEinRequired ? (
              <span className="text-destructive">*</span>
            ) : (
              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            )}
          </Label>
          <Input
            id="ein"
            value={data.ein}
            onChange={(e) => onChange({ ein: e.target.value })}
            placeholder="XX-XXXXXXX"
          />
          <p className="text-xs text-muted-foreground">Format: 9 digits (XX-XXXXXXX)</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="year-established">
            Year Established <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="year-established"
              value={data.yearEstablished}
              onChange={(e) => onChange({ yearEstablished: e.target.value })}
              placeholder="e.g. 2018"
            />
            <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Number of Full-Time Employees <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
          {employeeRanges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onChange({ employeeRange: range })}
              className={cn(
                "rounded-lg border px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer text-center",
                range === data.employeeRange
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input bg-background text-foreground hover:bg-muted"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Global Headquarters Address Section */}
      <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-3.5 sm:p-4">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Headquarters Location
          </Label>
          <p className="text-xs text-muted-foreground">
            Used to calculate service coverage radius and geocode GPS coordinates worldwide.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="main-address">
            Main Address / Building / Area
          </Label>
          <div className="relative">
            <Input
              id="main-address"
              className="pl-9"
              value={data.mainAddress || ""}
              onChange={(e) => handleAddressChange({ mainAddress: e.target.value })}
              placeholder="e.g. Suite 402, Al-Rehman Plaza, Canal Road"
            />
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="city">
              City <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="city"
                className="pl-9"
                value={data.city || ""}
                onChange={(e) => handleAddressChange({ city: e.target.value })}
                placeholder="e.g. Faisalabad, London, New York"
                required
              />
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State / Province</Label>
            <Input
              id="state"
              value={data.state || ""}
              onChange={(e) => handleAddressChange({ state: e.target.value })}
              placeholder="e.g. Punjab, Texas, Ontario"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">
              Country <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.country || "Pakistan"}
              onValueChange={(val) => handleAddressChange({ country: val })}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        All details are securely encrypted and verified through state corporate records.
      </p>
    </div>
  );
}