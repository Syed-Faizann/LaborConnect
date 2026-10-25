// frontend/src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import {
  Building2,
  CheckCircle2,
  Fan,
  Hammer,
  HardHat,
  Loader2,
  MapPin,
  Paintbrush,
  Search,
  Sparkles,
  Star,
  Trees,
  UserSearch,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import Navbar from "../components/Navbar.jsx";
import { getUnratedRequests, submitRequestRating } from "../services/api.js";

const categories = [
  {
    icon: Wrench,
    name: "Plumbing",
    pros: "1,240+ Pros",
    bg: "bg-primary-fixed",
    fg: "text-primary",
  },
  {
    icon: Zap,
    name: "Electrical",
    pros: "980+ Pros",
    bg: "bg-primary-fixed",
    fg: "text-primary",
  },
  {
    icon: HardHat,
    name: "Construction",
    pros: "2,100+ Pros",
    bg: "bg-tertiary-fixed",
    fg: "text-tertiary",
  },
  {
    icon: Paintbrush,
    name: "Painting",
    pros: "850+ Pros",
    bg: "bg-primary-fixed",
    fg: "text-primary",
  },
  {
    icon: Hammer,
    name: "Carpentry",
    pros: "1,120+ Pros",
    bg: "bg-primary-fixed",
    fg: "text-primary",
  },
  {
    icon: Trees,
    name: "Landscaping",
    pros: "640+ Pros",
    bg: "bg-primary-fixed",
    fg: "text-primary",
  },
];

export default function HomePage({ dbUser, authError }) {
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();

  // Search Bar States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  // Rating Modal States
  const [unratedRequests, setUnratedRequests] = useState([]);
  const [activeRatingJob, setActiveRatingJob] = useState(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewNote, setReviewNote] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Check for completed, unrated requests on page load
  useEffect(() => {
    async function checkCompletedReviews() {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        if (!token) return;
        const data = await getUnratedRequests(token);
        if (Array.isArray(data) && data.length > 0) {
          setUnratedRequests(data);
          setActiveRatingJob(data[0]);
        }
      } catch (err) {
        console.error("Error fetching unrated requests:", err.message);
      }
    }
    checkCompletedReviews();
  }, [isSignedIn, getToken]);

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!activeRatingJob) return;

    try {
      setSubmittingRating(true);
      const token = await getToken();
      await submitRequestRating(
        activeRatingJob._id,
        {
          rating: selectedRating,
          review: reviewNote,
        },
        token
      );

      const remaining = unratedRequests.filter((r) => r._id !== activeRatingJob._id);
      setUnratedRequests(remaining);
      setActiveRatingJob(remaining.length > 0 ? remaining[0] : null);
      setReviewNote("");
      setSelectedRating(5);
    } catch (err) {
      alert(err.message || "Failed to submit rating.");
    } finally {
      setSubmittingRating(false);
    }
  };

  // Execute Search and navigate with query parameters
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }
    if (searchLocation.trim()) {
      params.set("location", searchLocation.trim());
    }
    navigate(`/marketplace?${params.toString()}`);
  };

  // Reusable Search Module
  const renderSearchModule = () => (
    <form onSubmit={handleSearch} className="glass-panel w-full max-w-3xl rounded-xl p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="What service do you need?"
            className="w-full rounded-lg border border-outline-variant bg-surface-lowest py-3 pl-10 pr-4 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            placeholder="Location (e.g. Faisalabad, Punjab)"
            className="w-full rounded-lg border border-outline-variant bg-surface-lowest py-3 pl-10 pr-4 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          className="w-full whitespace-nowrap rounded-lg bg-primary px-6 py-3 font-display text-sm font-medium tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary-fixed-dim hover:text-primary md:w-auto cursor-pointer"
        >
          Search
        </button>
      </div>
    </form>
  );

  // Reusable Badges
  const renderBadges = () => (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
      <p className="flex items-center gap-2 text-sm text-on-surface-variant">
        <CheckCircle2 className="size-4 shrink-0 text-primary" /> Verified Profiles
      </p>
      <p className="flex items-center gap-2 text-sm text-on-surface-variant">
        <CheckCircle2 className="size-4 shrink-0 text-primary" /> Secure Payments
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      <Navbar dbUser={dbUser} />

      {/* COMPLETED JOB RATING POPUP MODAL */}
      {activeRatingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveRatingJob(null)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3 pr-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Rate Your Experience</h3>
                <p className="text-xs text-muted-foreground">Your service request was recently completed!</p>
              </div>
            </div>

            {/* Request Summary */}
            <div className="mt-4 rounded-2xl border border-border/80 bg-muted/40 p-3.5 text-xs">
              <p className="font-bold text-foreground leading-snug">{activeRatingJob.title}</p>
              <p className="mt-1 text-muted-foreground">
                Contractor:{" "}
                <span className="font-semibold text-primary">
                  {activeRatingJob.company?.name || "Service Professional"}
                </span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitRating} className="mt-5 space-y-4">
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`size-8 transition-colors ${
                          (hoverRating || selectedRating) >= star
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedRating} of 5 Stars
                </span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Review &amp; Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Share details on quality of work, punctuality, and professionalism..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveRatingJob(null)}
                  className="w-full sm:flex-1 rounded-xl border border-border py-2.5 text-xs font-semibold hover:bg-muted cursor-pointer"
                >
                  Maybe Later
                </button>
                <button
                  type="submit"
                  disabled={submittingRating}
                  className="w-full sm:flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {submittingRating ? (
                    <Loader2 className="mx-auto size-4 animate-spin" />
                  ) : (
                    "Submit Review"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {authError && (
        <div className="mx-auto max-w-[1280px] px-4 pt-4 md:px-10">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {authError}
          </p>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative mx-auto max-w-[1280px] overflow-hidden px-4 pb-16 pt-10 sm:pb-20 sm:pt-16 md:px-10 md:pb-32 md:pt-24">
          <div className="relative z-10 grid grid-cols-1 items-center gap-6 md:grid-cols-12">
            
            {/* Left Column (Heading + Text, and Desktop Search/Badges) */}
            <div className="flex flex-col gap-6 md:col-span-7">
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight md:leading-[56px] tracking-[-0.02em] text-on-background">
                {dbUser?.fullName
                  ? `Welcome back, ${dbUser.fullName}`
                  : "Find Trusted Companies for"}{" "}
                <span className="text-primary">Any Job</span>
              </h1>
              <p className="max-w-2xl text-base md:text-lg leading-relaxed md:leading-7 text-on-surface-variant">
                Connect with verified service professionals for construction,
                maintenance, and specialized labor. Enterprise-grade talent,
                ready when you need it.
              </p>

              {/* Desktop Only Search & Badges (Hidden on mobile/tablet) */}
              <div className="hidden flex-col gap-6 md:flex">
                {renderSearchModule()}
                {renderBadges()}
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative mt-2 sm:mt-4 md:col-span-5 md:mt-0">
              <div className="absolute inset-0 rotate-2 sm:rotate-3 scale-102 sm:scale-105 rounded-2xl bg-secondary-container opacity-50" />
              <div className="relative h-[260px] sm:h-[340px] md:h-[400px] overflow-hidden rounded-2xl shadow-lg">
                <img
                  className="h-full w-full object-cover"
                  alt="A professional construction site manager in high-visibility gear holding a digital tablet at a commercial building project"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-rFX5OWuponlNi9bODxXHmewKIf1QUJIjCa_dOdIvUE8vVJDnZHrffz39ODgc2IXEIpOi-INuID_BA6Mym6oZM1rwxv8k9xF5cSEeqrSaMCCR4dkOtSM1KnL_3D5fEqrrURABbr-rWoAWgRlXUgQoJyMZdzwDdmTDtr5xTj-TgS0E8Ul0Sr8iwgzli4D0G76a_tkQRYeuw9ATzPGbWWKzJd1wrPf3VphOz9n1ADueRNCs47MP7bA3NQ"
                />
              </div>
            </div>

            {/* Mobile/Tablet Only: Search Module & Badges BELOW the photo */}
            <div className="flex flex-col gap-4 pt-2 md:hidden">
              {renderSearchModule()}
              {renderBadges()}
            </div>

          </div>
        </section>

        {/* Categories Section (Bento Grid) */}
        <section className="bg-surface-container-low px-4 py-16 sm:py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-8 sm:mb-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl sm:text-[32px] font-semibold leading-tight sm:leading-10 tracking-[-0.01em] text-on-background">
                  Explore Categories
                </h2>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-on-surface-variant">
                  Browse professionals by specialized trade.
                </p>
              </div>
              <button
                onClick={() => navigate("/marketplace")}
                className="self-start sm:self-auto font-display text-sm font-medium tracking-[0.05em] text-primary hover:underline cursor-pointer"
              >
                View all services
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.slice(0, 2).map((c) => (
                <CategoryCard key={c.name} {...c} />
              ))}

              {/* HVAC Systems Card */}
              <div
                onClick={() => navigate(`/marketplace?category=${encodeURIComponent("HVAC")}`)}
                className="group flex cursor-pointer flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 rounded-xl border border-outline-variant bg-surface-lowest p-5 sm:p-6 transition-shadow hover:shadow-md sm:col-span-2"
              >
                <div className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-lg bg-secondary-fixed text-secondary transition-transform group-hover:scale-110">
                  <Fan className="size-6 sm:size-7" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-on-surface transition-colors group-hover:text-primary">
                    HVAC Systems
                  </h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Heating, ventilation, and air conditioning specialists for
                    commercial spaces.
                  </p>
                </div>
              </div>

              {categories.slice(2).map((c) => (
                <CategoryCard key={c.name} {...c} />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="mx-auto max-w-[1280px] px-4 py-16 sm:py-20 md:px-10 md:py-24">
          <div className="mb-12 sm:mb-16 text-center">
            <h2 className="font-display text-2xl sm:text-[32px] font-semibold leading-tight sm:leading-10 tracking-[-0.01em] text-on-background">
              How It Works
            </h2>
            <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base text-on-surface-variant">
              A streamlined process whether you're hiring talent or looking for
              your next big project.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-16">
            {/* For Customers */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-outline-variant bg-surface p-6 sm:p-8">
              <div className="absolute right-0 top-0 size-32 rounded-bl-full bg-primary-fixed opacity-20 pointer-events-none" />
              <div>
                <h3 className="mb-6 flex items-center gap-3 font-display text-xl sm:text-2xl font-semibold leading-8 text-on-surface">
                  <UserSearch className="size-6 text-primary shrink-0" /> For Customers
                </h3>
                <div className="relative z-10 space-y-6">
                  {[
                    [
                      "Post your job or search",
                      "Detail your requirements and location to find matching professionals.",
                    ],
                    [
                      "Compare quotes & profiles",
                      "Review proposals, past work, and verified ratings.",
                    ],
                    [
                      "Hire & manage",
                      "Securely contract and pay through our milestone system.",
                    ],
                  ].map(([title, desc], i) => (
                    <Step
                      key={title}
                      n={i + 1}
                      title={title}
                      desc={desc}
                      accent="primary"
                    />
                  ))}
                </div>
              </div>
              <div className="mt-8 border-t border-outline-variant pt-6">
                <button
                  onClick={() => navigate("/marketplace")}
                  className="w-full rounded-lg bg-primary-container py-3 font-display text-sm font-medium tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary cursor-pointer"
                >
                  Find a Company
                </button>
              </div>
            </div>

            {/* For Companies */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-outline-variant bg-surface p-6 sm:p-8">
              <div className="absolute right-0 top-0 size-32 rounded-bl-full bg-secondary-fixed opacity-20 pointer-events-none" />
              <div>
                <h3 className="mb-6 flex items-center gap-3 font-display text-xl sm:text-2xl font-semibold leading-8 text-on-surface">
                  <Building2 className="size-6 text-secondary shrink-0" /> For Companies
                </h3>
                <div className="relative z-10 space-y-6">
                  {[
                    [
                      "Create your profile",
                      "Showcase your services, certifications, and portfolio.",
                    ],
                    [
                      "Find relevant leads",
                      "Get matched with local enterprise and residential projects.",
                    ],
                    [
                      "Win work & grow",
                      "Build your reputation and access guaranteed payments.",
                    ],
                  ].map(([title, desc], i) => (
                    <Step
                      key={title}
                      n={i + 1}
                      title={title}
                      desc={desc}
                      accent="secondary"
                    />
                  ))}
                </div>
              </div>
              <div className="mt-8 border-t border-outline-variant pt-6">
                <button
                  onClick={() => navigate("/company-registration")}
                  className="w-full rounded-lg border border-outline bg-surface-container-highest py-3 font-display text-sm font-medium tracking-[0.05em] text-on-surface transition-colors hover:bg-outline-variant cursor-pointer"
                >
                  Register Your Company
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-outline-variant bg-surface-lowest">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-between gap-6 px-4 py-8 sm:px-6 md:flex-row md:px-10">
          <div className="text-center md:text-left">
            <span className="font-display text-2xl font-bold text-on-surface">
              LaborConnect
            </span>
            <p className="mt-2 text-sm text-on-surface-variant">
              © {new Date().getFullYear()} LaborConnect Inc. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link
              to="/support"
              className="font-display text-xs font-semibold text-primary transition-colors hover:underline"
            >
              Contact Support &amp; Report Issue
            </Link>
            <a
              href="#"
              className="font-display text-xs font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="font-display text-xs font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="font-display text-xs font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              Sitemap
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CategoryCard({ icon: Icon, name, bg, fg }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/marketplace?category=${encodeURIComponent(name)}`)}
      className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-outline-variant bg-surface-lowest p-5 sm:p-6 transition-shadow hover:shadow-md"
    >
      <div
        className={`flex size-12 items-center justify-center rounded-lg ${bg} ${fg} transition-transform group-hover:scale-110`}
      >
        <Icon className="size-6" />
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-on-surface transition-colors group-hover:text-primary">
          {name}
        </h3>
      </div>
    </div>
  );
}

function Step({ n, title, desc, accent }) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          accent === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {n}
      </div>
      <div>
        <h4 className="mb-1 font-display text-sm font-medium tracking-[0.05em] text-on-surface">
          {title}
        </h4>
        <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}