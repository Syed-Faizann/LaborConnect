// frontend/src/pages/Marketplace.jsx
import {
  ArrowRight,
  CheckCircle2,
  Fan,
  Filter,
  Hammer,
  HardHat,
  Loader2,
  Paintbrush,
  Recycle,
  Search,
  SlidersHorizontal,
  Star,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "../components/ui/button";
import Navbar from "../components/Navbar";
import { listPublishedCompanyPages } from "../services/api";

const SERVICE_ICONS = {
  plumbing: Wrench,
  electrical: Zap,
  electric: Zap,
  hvac: Fan,
  "hvac systems": Fan,
  construction: HardHat,
  painting: Paintbrush,
  carpentry: Hammer,
  landscaping: Recycle,
};

function getServiceIcon(serviceName = "") {
  const lower = serviceName.toLowerCase().trim();
  for (const [key, Icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Wrench;
}

// 1. MOVED OUTSIDE of Marketplace so it does not unmount & lose input focus on keystrokes
function FilterContent({
  category,
  setCategory,
  location,
  setLocation,
  verifiedOnly,
  setVerifiedOnly,
  rating,
  setRating,
  clearFilters,
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-4 font-display text-2xl font-semibold">Filters</h2>

        {/* Service Category */}
        <div className="mb-4">
          <label htmlFor="category" className="mb-2 block font-display text-sm font-medium text-muted-foreground">
            Service Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm outline-none focus:border-primary"
          >
            <option>All Categories</option>
            <option>Plumbing</option>
            <option>Electrical</option>
            <option>HVAC</option>
            <option>Construction</option>
            <option>Painting</option>
            <option>Carpentry</option>
            <option>Landscaping</option>
          </select>
        </div>

        {/* Location */}
        <div className="mb-4">
          <label htmlFor="location" className="mb-2 block font-display text-sm font-medium text-muted-foreground">
            Location
          </label>
          <input
            id="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm outline-none focus:border-primary"
            placeholder="City or Zip Code"
          />
        </div>

        {/* Verified Only */}
        <label className="mb-4 flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(event) => setVerifiedOnly(event.target.checked)}
            className="size-4 accent-primary"
          />
          Verified Only
        </label>

        {/* Minimum Rating Slider */}
        <div className="mb-4">
          <label htmlFor="rating" className="mb-2 block font-display text-sm font-medium text-muted-foreground">
            Minimum Rating
          </label>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span className="font-bold">
              {rating === 0 ? "All Ratings" : `${rating.toFixed(1)} & Up`}
            </span>
          </div>
          <input
            id="rating"
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="mt-2 w-full accent-primary cursor-pointer"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={clearFilters} className="w-full rounded-xl border border-border cursor-pointer">
          Clear Filters
        </Button>
      </div>
    </div>
  );
}

export default function Marketplace({ dbUser }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Mobile Filter Drawer Toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Initialize filters
  const initialCategory = searchParams.get("category") || searchParams.get("search") || "All Categories";
  const initialLocation = searchParams.get("location") || "";

  const [category, setCategory] = useState(initialCategory);
  const [location, setLocation] = useState(initialLocation);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [rating, setRating] = useState(0); // 0 = All Ratings
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await listPublishedCompanyPages();
        setCompanies(Array.isArray(data) ? data : []);
      } catch (err) {
        setLoadError(err.message || "Failed to load companies");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // 1. Hard Safety: Never show rejected or pending companies
      const isRejected =
        c.status === "rejected" ||
        c.company?.status === "rejected" ||
        c.status === "pending" ||
        c.company?.status === "pending";
      if (isRejected) return false;

      // 2. Verified Only Filter
      if (verifiedOnly) {
        const isVerified =
          c.status === "verified" ||
          c.company?.status === "verified" ||
          c.isVerified === true;
        if (!isVerified) return false;
      }

      // 3. Category Match
      const matchesCategory =
        category === "All Categories" ||
        c.services?.some((s) => s.name?.toLowerCase().includes(category.toLowerCase())) ||
        c.specialties?.some((s) => s.toLowerCase().includes(category.toLowerCase())) ||
        c.name?.toLowerCase().includes(category.toLowerCase());

      // 4. Location Match
      const matchesLocation =
        !location.trim() ||
        c.city?.toLowerCase().includes(location.trim().toLowerCase()) ||
        c.state?.toLowerCase().includes(location.trim().toLowerCase());

      // 5. Rating Filter
      const compRating = Number(c.rating) || 0;
      const matchesRating = rating === 0 || compRating >= rating;

      return matchesCategory && matchesLocation && matchesRating;
    });
  }, [companies, category, location, verifiedOnly, rating]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (category !== "All Categories") count++;
    if (location.trim()) count++;
    if (verifiedOnly) count++;
    if (rating > 0) count++;
    if (minimumPrice !== "" || maximumPrice !== "") count++;
    return count;
  }, [category, location, verifiedOnly, rating, minimumPrice, maximumPrice]);

  function clearFilters() {
    setCategory("All Categories");
    setLocation("");
    setVerifiedOnly(false);
    setRating(0);
    setMinimumPrice("");
    setMaximumPrice("");
  }

  const filterProps = {
    category,
    setCategory,
    location,
    setLocation,
    verifiedOnly,
    setVerifiedOnly,
    rating,
    setRating,
    clearFilters,
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <Navbar dbUser={dbUser} />

      <div className="flex min-h-0 flex-1 relative">
        {/* Desktop Sidebar Filter */}
        <aside
          className="hidden md:flex w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-card px-6 py-8"
          aria-label="Marketplace filters"
        >
          <FilterContent {...filterProps} />
        </aside>

        {/* Mobile Filter Drawer Modal (< md) */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-card p-6 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <span className="font-display font-semibold text-lg flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-primary" /> Filter Results
                </span>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <FilterContent {...filterProps} />

              <Button
                onClick={() => setMobileFilterOpen(false)}
                className="mt-6 w-full rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                Apply Filters ({filteredCompanies.length})
              </Button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6 md:px-10 md:py-8">
          
          {/* Top Bar: Title, Count & Mobile Filter Trigger */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Marketplace</h1>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                {filteredCompanies.length} contractor{filteredCompanies.length === 1 ? "" : "s"} listed
              </p>
            </div>

            {/* Mobile Filter Button */}
            <div className="flex items-center gap-2 md:hidden">
              <Button
                variant="outline"
                onClick={() => setMobileFilterOpen(true)}
                className="flex items-center gap-2 rounded-xl border-border text-xs font-semibold py-2 px-3.5 h-9 cursor-pointer"
              >
                <SlidersHorizontal className="size-3.5 text-primary" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground h-9 px-2 hover:text-foreground cursor-pointer"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Company Cards Grid */}
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" /> Loading companies...
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center text-sm text-destructive">
              {loadError}
            </div>
          ) : filteredCompanies.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCompanies.map((company) => (
                <article
                  key={company._id}
                  className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
                >
                  <div>
                    <div
                      className="flex cursor-pointer items-start gap-3 sm:gap-4"
                      onClick={() => navigate(`/companies/${company._id}`)}
                    >
                      <div className="size-12 sm:size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-accent">
                        {company.logoUrl ? (
                          <img className="size-full object-cover" src={company.logoUrl} alt={`${company.name} logo`} />
                        ) : (
                          <div className="grid size-full place-items-center text-sm sm:text-base font-black text-accent-foreground">
                            {company.name?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <h2 className="truncate font-display text-base sm:text-lg font-bold group-hover:text-primary transition-colors">
                            {company.name || "Unnamed Company"}
                          </h2>
                          <CheckCircle2 className="size-4 shrink-0 fill-primary text-primary-foreground" aria-label="Verified company" />
                        </div>

                        {/* Location and Live Star Rating Row */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-medium text-muted-foreground">
                          <span className="truncate max-w-[140px] sm:max-w-none">
                            {[company.city, company.state].filter(Boolean).join(", ") || "Location not set"}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            {Number(company.rating) > 0 ? (
                              <>
                                <span>{Number(company.rating).toFixed(1)}</span>
                                <span className="text-[11px] text-muted-foreground font-normal">
                                  ({company.reviewCount || 0})
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground font-normal">New</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {company.tagline || company.about || "No description provided yet."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {company.services?.slice(0, 3).map((svc) => {
                        const Icon = getServiceIcon(svc.name);
                        return (
                          <span
                            key={svc._id || svc.name}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary"
                          >
                            <Icon className="size-3.5 shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{svc.name}</span>
                          </span>
                        );
                      })}
                      {company.services?.length > 3 && (
                        <span className="inline-flex items-center rounded-lg border border-border bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                          +{company.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 flex gap-2 border-t border-border/80 pt-4">
                    <Button className="flex-1 rounded-xl text-xs sm:text-sm cursor-pointer" onClick={() => navigate(`/requestform?companyId=${company._id}`)}>
                      Request Service
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl border-border cursor-pointer shrink-0"
                      aria-label="View company profile"
                      onClick={() => navigate(`/companies/${company._id}`)}
                    >
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
              <Search className="mx-auto mb-3 size-8 text-muted-foreground" />
              <h2 className="font-display text-lg font-bold">No companies found</h2>
              <p className="mt-1 text-xs text-muted-foreground">Try clearing or adjusting your rating or category filters.</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
                Clear All Filters
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}