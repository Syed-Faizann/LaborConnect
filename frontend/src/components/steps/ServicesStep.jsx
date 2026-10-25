// frontend/src/components/steps/ServicesStep.jsx
import { X, Plus } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Badge } from "../ui/badge";

export function ServicesStep({ data, onChange, settings }) {
  function addSpecialty(val) {
    const value = val?.trim();
    if (!value) return;
    const current = data.specialties || [];
    if (!current.includes(value)) {
      onChange({ specialties: [...current, value] });
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && e.target.value.trim()) {
      e.preventDefault();
      addSpecialty(e.target.value);
      e.target.value = "";
    }
  }

  function removeSpecialty(specialty) {
    const current = data.specialties || [];
    onChange({ specialties: current.filter((s) => s !== specialty) });
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Specialties &amp; Coverage Area
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Set up your specific trade competencies and operational coverage radius.
        </p>
      </div>

      {/* QUICK SUGGESTIONS FROM ADMIN SETTINGS */}
      {settings?.categories?.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 sm:p-3.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">
            Available Platform Categories (Click to add)
          </Label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {settings.categories.map((cat) => {
              const isAdded = (data.specialties || []).includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => addSpecialty(cat)}
                  disabled={isAdded}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    isAdded
                      ? "border border-primary/40 bg-primary/10 text-primary opacity-60 cursor-default"
                      : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  <Plus className="size-3" /> {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE TRADE SPECIALTIES */}
      <div className="space-y-2.5 sm:space-y-3">
        <Label>ACTIVE TRADE SPECIALTIES <span className="text-destructive">*</span></Label>
        <p className="text-xs text-muted-foreground">
          Click × to remove or type custom specialties and press Enter.
        </p>
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {(data.specialties || []).map((specialty) => (
              <Badge key={specialty} variant="secondary" className="flex items-center gap-1 pr-1 font-normal text-xs">
                <span>{specialty}</span>
                <button
                  type="button"
                  onClick={() => removeSpecialty(specialty)}
                  className="rounded-full p-0.5 hover:bg-muted cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            placeholder="+ Type specialty and press Enter..."
            className="mt-2 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm"
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {/* COVERAGE AREA */}
      <div className="space-y-3.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <Label>COVERAGE AREA</Label>
          <Badge variant="secondary" className="font-normal text-[11px] sm:text-xs self-start sm:self-auto">
            {data.coverageRadius || 25} miles radius from headquarters
          </Badge>
        </div>
        <Slider
          value={[data.coverageRadius || 25]}
          onValueChange={(val) => onChange({ coverageRadius: val[0] })}
          max={100}
          step={1}
        />
        <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
          <span>5 miles</span>
          <span>25 miles</span>
          <span>50 miles</span>
          <span>100+ miles</span>
        </div>
      </div>
    </div>
  );
}