// frontend/src/pages/About.jsx
import { Button } from "../components/ui/button";
import Navbar from "../components/Navbar";
import { referenceImages } from "../lib/reference-image";
import { useNavigate } from "react-router";

import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Handshake,
  HardHat,
  Home,
  MapPin,
  Radio,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const metrics = [
  ["Verified Companies", "10,000+", "Licensed & insured service firms across 42 states"],
  ["Service Requests", "35,000+", "Custom client requests completed with 99% satisfaction"],
  ["Escrow Protection", "$48M+", "Milestone funds released safely upon final sign-off"],
  ["Fast Dispatch", "14 min", "Average response time from request to first company quote"],
];

const customerSteps = [
  ["Post Your Specific Service Need", "Define trade requirements, project timeline, location, budget range, and upload photos or blueprints."],
  ["Receive Quotes from Vetted Local Companies", "Compare itemized proposals, check verified state licenses, review insurance limits, and view past job ratings."],
  ["Chat, Track Progress & Pay Securely via Escrow", "Coordinate directly with the dispatched crew. Funds remain secure in escrow until you approve each milestone."],
];

const companySteps = [
  ["Register & Verify Trade Licenses", "Complete fast digital verification of state licenses, EIN business registration, and certificate of insurance (COI)."],
  ["Browse Customer Requests in Your Zone", "Filter by trade category, budget, proximity, and urgency. Get notified when matching customer requests are posted."],
  ["Submit Proposals, Dispatch & Get Paid Guaranteed", "Send custom quotes, manage tech schedules, upload work logs, and receive guaranteed payouts upon dual sign-off."],
];

function SectionIntro({ eyebrow, title, children }) {
  return (
    <div className="max-w-2xl mb-8 sm:mb-12">
      <span className="text-xs font-bold uppercase text-primary">{eyebrow}</span>
      <h2 className="mt-2 sm:mt-3 font-display text-2xl sm:text-3xl font-semibold leading-tight md:text-[32px]">{title}</h2>
      {children && <p className="mt-2 sm:mt-3 text-sm sm:text-base leading-relaxed sm:leading-7 text-muted-foreground">{children}</p>}
    </div>
  );
}

function StepCard({ kind, title, intro, steps, note, link, onAction }) {
  const customer = kind === "customer";
  return (
    <article className={`flex flex-col justify-between rounded-xl border-t-4 bg-card p-5 sm:p-6 md:p-8 shadow-sm ${customer ? "border-primary" : "border-slate-500"}`}>
      <div>
        <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
          <span className={`flex size-11 sm:size-12 items-center justify-center rounded-lg ${customer ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>
            {customer ? <UserRound className="size-6 sm:size-7" /> : <BriefcaseBusiness className="size-6 sm:size-7" />}
          </span>
          <span className={`rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold ${customer ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>
            {customer ? "FOR CUSTOMERS" : "FOR SERVICE COMPANIES"}
          </span>
        </div>
        <h3 className="font-display text-xl sm:text-2xl font-semibold">{title}</h3>
        <p className="mb-5 sm:mb-6 mt-2 text-xs sm:text-sm text-muted-foreground">{intro}</p>
        <div className="space-y-3 sm:space-y-4">
          {steps.map(([heading, description], index) => (
            <div className="flex gap-3 sm:gap-4 rounded-lg bg-background p-3.5 sm:p-4 border border-border" key={heading}>
              <span className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-primary-foreground ${customer ? "bg-primary" : "bg-slate-600"}`}>
                {index + 1}
              </span>
              <div>
                <strong className="block font-display text-xs sm:text-sm font-semibold">{heading}</strong>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed sm:leading-5 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 sm:pt-6">
        <span className="text-xs sm:text-sm text-muted-foreground">{note}</span>
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:underline cursor-pointer"
        >
          {link}
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}

export default function AboutPage({ dbUser }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Persistent global Navbar */}
      <Navbar dbUser={dbUser} />

      <main id="top">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-muted/30 pb-12 pt-8 sm:pb-16 sm:pt-12 md:pb-24 md:pt-16">
          <div className="mx-auto grid max-w-[1280px] items-center gap-8 px-4 sm:px-6 md:px-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <div className="mb-4 sm:mb-6 inline-flex max-w-full items-center gap-2 rounded-full bg-card px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-primary shadow-sm border border-border">
                <span className="size-2 shrink-0 rounded-full bg-primary" />
                <span className="truncate">TWO-SIDED VERIFIED TRADE NETWORK</span>
              </div>
              <h1 className="max-w-2xl font-display text-3xl sm:text-4xl font-bold leading-tight sm:leading-[1.17] md:text-5xl md:leading-[1.17]">
                Bridging Customers with Tailored Needs and Verified Service Companies
              </h1>
              <p className="mt-4 sm:mt-6 max-w-xl text-sm sm:text-base md:text-lg leading-relaxed sm:leading-7 text-muted-foreground">
                LaborConnect is the dedicated marketplace connecting property owners, businesses, and homeowners with licensed service contractors. Create custom requests, receive competitive quotes, and complete projects with guaranteed escrow security.
              </p>
              <div className="mt-8 sm:mt-12 flex flex-col gap-3 sm:gap-4 border-t border-border pt-5 sm:pt-6 text-xs font-semibold sm:flex-row sm:items-center">
                <span className="flex items-center gap-2">
                  <Home size={18} className="shrink-0 text-primary" />
                  For Customers: Custom Specs &amp; Vetted Bids
                </span>
                <span className="hidden text-border sm:block">•</span>
                <span className="flex items-center gap-2">
                  <HardHat size={18} className="shrink-0 text-primary" />
                  For Contractors: Local Job Leads &amp; Escrow Payouts
                </span>
              </div>
            </div>

            {/* HERO IMAGE + BADGES */}
            <div className="relative mt-2 lg:col-span-5 lg:mt-0">
              <div className="relative aspect-[4/5] sm:aspect-[4/4.5] md:aspect-[4/5] overflow-hidden rounded-xl bg-card shadow-xl border border-border">
                <img
                  src={referenceImages[0]}
                  alt="Electrician inspecting a commercial switchboard"
                  className="size-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-5 sm:right-5 rounded-lg bg-card/95 p-3.5 sm:p-5 shadow-lg backdrop-blur-md md:left-6 md:right-6 border border-border">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] sm:text-[11px] font-semibold text-primary">
                    <span className="flex items-center gap-1">
                      <BadgeCheck className="size-3.5 sm:size-4" /> VERIFIED SERVICE COMPANY #LIC-84210
                    </span>
                    <span className="text-muted-foreground">READY TO BID</span>
                  </div>
                  <p className="mt-1 sm:mt-2 font-display text-base sm:text-lg font-semibold truncate">Apex Commercial Electrical Inc.</p>
                  <div className="mt-2 sm:mt-3 flex flex-wrap justify-between gap-1 text-xs sm:text-sm text-muted-foreground">
                    <span>Request: Switchgear Retrofit</span>
                    <span className="font-semibold text-primary">3 Custom Quotes</span>
                  </div>
                </div>
              </div>
              <div className="relative mt-3 sm:-mt-8 sm:-ml-3 md:-ml-6 flex w-fit items-center gap-3 sm:gap-4 rounded-lg bg-card p-3 sm:p-4 shadow-lg border border-border">
                <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-5 sm:size-6" />
                </span>
                <span>
                  <small className="block text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground">Escrow Protection</small>
                  <strong className="font-display text-xs sm:text-sm">100% Guaranteed</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS ROW */}
        <section className="bg-card py-6 sm:py-8 border-y border-border">
          <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-3 sm:gap-5 px-4 sm:px-6 md:grid-cols-4 md:px-10">
            {metrics.map(([label, value, text]) => (
              <div key={label} className="rounded-lg bg-background p-3.5 sm:p-4 border border-border">
                <p className="text-[10px] sm:text-xs font-bold uppercase text-primary line-clamp-1">{label}</p>
                <strong className="mt-1.5 sm:mt-2 block font-display text-2xl sm:text-3xl font-bold md:text-5xl">{value}</strong>
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-snug sm:leading-5 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MARKETPLACE MODEL */}
        <section className="py-12 sm:py-16 md:py-20" id="marketplace">
          <div className="mx-auto grid max-w-[1280px] items-center gap-8 sm:gap-10 px-4 sm:px-6 md:px-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <img
                className="aspect-[4/3] w-full rounded-xl object-cover shadow-md border border-border"
                src={referenceImages[1]}
                alt="Construction and operations professionals reviewing plans together"
              />
              <div className="mt-4 flex gap-3 sm:gap-4 rounded-xl bg-muted/40 p-4 sm:p-6 border border-border">
                <Radio className="shrink-0 text-primary size-6 sm:size-7" />
                <div>
                  <h3 className="font-display text-base sm:text-lg font-semibold">The Two-Sided Marketplace</h3>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed sm:leading-5 text-muted-foreground">
                    Connecting customers who need precision trade work with verified service companies and contractors ready to bid with transparent pricing, guaranteed escrow, and real-time tracking.
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7">
              <span className="text-xs font-bold uppercase text-primary">Our Marketplace Model</span>
              <h2 className="mt-2 sm:mt-3 font-display text-2xl sm:text-3xl font-semibold leading-tight md:text-[32px]">
                Designed for how modern trade services should actually work.
              </h2>
              <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 text-sm sm:text-base md:text-lg leading-relaxed sm:leading-7 text-muted-foreground">
                <p>
                  LaborConnect transforms traditional hiring by removing the guesswork, broker markups, and unvetted referrals. Whether you're a homeowner renovating a property, a business facility manager overseeing maintenance, or a general contractor staffing job sites, you can post exact scopes of work and receive transparent bids from licensed companies.
                </p>
                <p>
                  For registered contractors and specialized service firms, LaborConnect acts as a direct business growth engine—delivering qualified local requests, eliminating non-paying clients through FDIC-insured milestone escrow, and automating compliance reporting.
                </p>
              </div>
              <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4 rounded-xl bg-muted/40 p-4 sm:p-5 sm:grid-cols-2 border border-border">
                <div className="rounded-lg bg-card p-3.5 sm:p-4 border border-border">
                  <span className="text-xs font-bold uppercase text-primary">For Customers</span>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed sm:leading-5 text-muted-foreground">Post tailored scopes, compare transparent company bids, chat in real time, and approve milestones with full escrow protection.</p>
                </div>
                <div className="rounded-lg bg-card p-3.5 sm:p-4 border border-border">
                  <span className="text-xs font-bold uppercase text-slate-500">For Companies</span>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed sm:leading-5 text-muted-foreground">Verify credentials once, browse active customer requests in your region, send custom quotes, and get paid with zero fee risk.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-muted/30 py-12 sm:py-16 md:py-20" id="how-it-works">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
            <SectionIntro eyebrow="Clear Operational Process" title="How LaborConnect Works for Both Sides">
              A seamless dual-track system built to give customers certainty and trade companies reliable, profitable jobs.
            </SectionIntro>
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
              <StepCard
                kind="customer"
                title="Homeowners, Property Managers & Businesses"
                intro="Get specialized work done without hunting through unverified directories:"
                steps={customerSteps}
                note="No obligation to accept quotes"
                link="Create a Request"
                onAction={() => navigate("/marketplace")}
              />
              <StepCard
                kind="company"
                title="Licensed Contractors & Trade Providers"
                intro="Streamline job acquisition and secure guaranteed payment for your craftsmanship:"
                steps={companySteps}
                note="Fast 24-hr verification"
                link="Register Company"
                onAction={() => navigate("/company-registration")}
              />
            </div>
          </div>
        </section>

        {/* SAFEGUARDS & TRUST */}
        <section className="py-12 sm:py-16 md:py-20" id="safeguards">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
            <SectionIntro eyebrow="Platform Trust & Safety" title="How We Safeguard Every Service Request">
              Both customers and contractors are protected by our automated compliance stack, financial escrow guarantees, and real-time operations engine.
            </SectionIntro>
            <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              <article className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                <BadgeCheck size={32} className="text-primary" />
                <span className="mt-4 sm:mt-5 block text-xs font-bold text-primary">PILLAR 01 / 03</span>
                <h3 className="mt-2 font-display text-lg sm:text-xl font-semibold">Rigorous 4-Step Verification</h3>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed sm:leading-6 text-muted-foreground">Every trade provider passes an automated multi-tier audit before receiving customer requests:</p>
                <ul className="mt-5 sm:mt-6 space-y-3 sm:space-y-4 text-xs sm:text-sm">
                  {[
                    ["State License Registry API", "Real-time sync with 50-state regulatory boards."],
                    ["EIN Corporate Validation", "IRS validation & active Secretary of State standing."],
                    ["$1M+ COI Direct Verification", "Automated insurer certificate underwriting checks."],
                    ["Background & OSHA Certs", "County criminal records and OSHA 10/30 validations."],
                  ].map(([a, b]) => (
                    <li key={a} className="flex gap-2.5 sm:gap-3">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-primary" />
                      <span><strong className="block text-foreground">{a}</strong><span className="text-muted-foreground">{b}</span></span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 sm:mt-8 flex justify-between border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
                  <span>Acceptance Rate: ~18%</span>
                  <span>Zero Fraud Tolerance</span>
                </div>
              </article>

              <article className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                <CircleDollarSign size={32} className="text-primary" />
                <span className="mt-4 sm:mt-5 block text-xs font-bold text-primary">PILLAR 02 / 03</span>
                <h3 className="mt-2 font-display text-lg sm:text-xl font-semibold">Escrow & Milestone Safety</h3>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed sm:leading-6 text-muted-foreground">
                  Full fiscal insulation that protects customers from unfinished work while assuring contractors that funds are held in escrow before work begins.
                </p>
                <div className="mt-5 sm:mt-6 space-y-3 rounded-lg bg-muted/40 p-4 sm:p-5 text-xs sm:text-sm border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <span className="leading-snug">Milestone 01: Inspection & Rough-in</span>
                    <strong className="text-primary shrink-0">Funded in Escrow</strong>
                  </div>
                  <div className="h-2 rounded-full bg-primary/20"><div className="h-full w-2/3 rounded-full bg-primary" /></div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="leading-snug">Milestone 02: Hardware & Commissioning</span>
                    <strong className="text-primary shrink-0">Protected ($14,200)</strong>
                  </div>
                </div>
                <p className="mt-4 sm:mt-5 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <ShieldCheck size={18} className="shrink-0 text-primary" />Disbursed instantly upon dual customer sign-off.
                </p>
                <div className="mt-6 sm:mt-8 flex justify-between border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
                  <span>Dispute Ratio: &lt; 0.4%</span>
                  <span>FDIC Insured Partners</span>
                </div>
              </article>

              <article className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm md:col-span-2 lg:col-span-1">
                <Radio size={32} className="text-primary" />
                <span className="mt-4 sm:mt-5 block text-xs font-bold text-primary">PILLAR 03 / 03</span>
                <h3 className="mt-2 font-display text-lg sm:text-xl font-semibold">Real-Time Operations Tech</h3>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed sm:leading-6 text-muted-foreground">
                  Intelligent routing matching incoming customer service requests to qualified local service companies within minutes.
                </p>
                <ul className="mt-5 sm:mt-6 space-y-4 sm:space-y-5 text-xs sm:text-sm">
                  {[
                    ["Direct Company Dispatch", "Immediate job broadcast to vetted technicians."],
                    ["Live GPS Telemetry", "Geo-fenced arrival & real-time job site logs."],
                    ["Diagnostic Messaging", "In-app scope specs, blueprint share & progress photos."],
                  ].map(([a, b], i) => (
                    <li key={a} className="flex gap-2.5 sm:gap-3">
                      {i === 0 ? <MapPin size={18} className="shrink-0 text-primary" /> : i === 1 ? <Radio size={18} className="shrink-0 text-primary" /> : <Check size={18} className="shrink-0 text-primary" />}
                      <span><strong className="block text-foreground">{a}</strong><span className="text-muted-foreground">{b}</span></span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 sm:mt-8 flex justify-between border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
                  <span>Platform Uptime: 99.98%</span>
                  <span>Sub-second Routing</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* LEADERSHIP / EXECUTIVE TEAM */}
        <section className="bg-muted/30 py-12 sm:py-16 md:py-20" id="leadership">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
            <SectionIntro eyebrow="Executive Guidance" title="Led by construction veterans & logistics engineers.">
              Our leadership fuses hardhat field experience with elite enterprise engineering from America’s premier tech and construction organizations.
            </SectionIntro>
            <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
              {[
                [
                  referenceImages[2],
                  "Marcus Reynolds",
                  "Co-Founder & Chief Executive Officer",
                  "Former VP of Operations at Apex Infrastructure, where he managed $620M in commercial utility expansion. Led workforce deployment programs across 14 metropolitan centers.",
                  "EX-APEX INFRASTRUCTURE",
                  "CO-FOUNDER",
                ],
                [
                  referenceImages[3],
                  "Elena Rostova",
                  "Chief Product Officer",
                  "Ex-Stripe and Procore Logistics product lead. Architect of scalable multi-party financial rails and contractor dispatch systems processing tens of millions in monthly transactional volume.",
                  "EX-STRIPE • EX-PROCORE",
                  "EXECUTIVE",
                ],
                [
                  referenceImages[4],
                  "Sarah Jenkins",
                  "Head of Trade Compliance & Safety",
                  "Master Electrician with 22 years in the field and certified OSHA 30 Inspector. Directed state occupational licensing review committees and authored safety standards adopted across 8 state unions.",
                  "MASTER ELEC • OSHA 30",
                  "COMPLIANCE",
                ],
              ].map(([image, name, role, bio, credential, label]) => (
                <article key={name} className="overflow-hidden rounded-xl bg-card shadow-sm border border-border flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img src={image} alt={`Portrait of ${name}`} className="size-full object-cover" />
                      <span className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 rounded bg-card/90 backdrop-blur-sm px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold text-primary border border-border">
                        {label}
                      </span>
                    </div>
                    <div className="p-4 sm:p-6">
                      <h3 className="font-display text-lg sm:text-xl font-semibold">{name}</h3>
                      <p className="mt-1 text-xs sm:text-sm font-semibold text-primary">{role}</p>
                      <p className="mt-3 sm:mt-4 text-xs sm:text-sm leading-relaxed sm:leading-6 text-muted-foreground">{bio}</p>
                    </div>
                  </div>
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                    <p className="border-t border-border pt-3 sm:pt-4 text-[11px] sm:text-xs font-bold text-muted-foreground truncate">{credential}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section id="get-started" className="bg-card border-t border-border py-12 sm:py-16 md:py-20">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
            <span className="text-xs font-semibold uppercase text-primary">READY TO GET STARTED?</span>
            <h2 className="mt-2 sm:mt-3 font-display text-2xl sm:text-3xl font-semibold md:text-[32px]">Choose your path on LaborConnect.</h2>
            <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
              Connect directly with verified trade professionals or register your company to access custom service requests with guaranteed milestone payments.
            </p>
            <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-5 sm:p-7 flex flex-col justify-between">
                <div>
                  <Home className="text-primary size-7 sm:size-8" />
                  <p className="mt-4 sm:mt-5 text-[11px] sm:text-xs font-semibold text-primary">LOOKING FOR SKILLED SERVICE?</p>
                  <h3 className="mt-1.5 sm:mt-2 font-display text-lg sm:text-xl font-semibold">Join as Customer &amp; Post a Request</h3>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">Submit your tailored scope and receive quotes in minutes.</p>
                </div>
                <Button className="mt-5 sm:mt-6 w-full sm:w-auto" onClick={() => navigate("/marketplace")}>
                  Find Pros &amp; Post <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-background p-5 sm:p-7 flex flex-col justify-between">
                <div>
                  <Building2 className="text-primary size-7 sm:size-8" />
                  <p className="mt-4 sm:mt-5 text-[11px] sm:text-xs font-semibold text-primary">LICENSED CONTRACTOR OR SERVICE COMPANY?</p>
                  <h3 className="mt-1.5 sm:mt-2 font-display text-lg sm:text-xl font-semibold">Register Your Company &amp; Find Work</h3>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">Access client service requests and guaranteed escrow disbursements.</p>
                </div>
                <Button variant="outline" className="mt-5 sm:mt-6 w-full sm:w-auto" onClick={() => navigate("/company-registration")}>
                  Browse Requests <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-muted/30 border-t border-border py-8 sm:py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-5 px-4 text-xs sm:text-sm text-muted-foreground sm:flex-row sm:px-6 md:px-10">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 font-display font-semibold text-foreground text-center sm:text-left">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Handshake size={17} />
            </span>
            <span>LaborConnect</span>
            <span className="font-sans font-normal text-muted-foreground">| © 2026 LaborConnect Inc. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-5 text-xs sm:text-sm">
            <a href="#safeguards" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#safeguards" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#get-started" className="hover:text-primary transition-colors">Contact Support</a>
            <a href="#top" className="hover:text-primary transition-colors">Back to Top</a>
          </div>
        </div>
      </footer>
    </div>
  );
}