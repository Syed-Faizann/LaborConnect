// frontend/src/pages/AuthPage.jsx
import React from "react";
import { useClerk } from "@clerk/clerk-react";

export default function AuthPage() {
  const { openSignIn, openSignUp } = useClerk();

  return (
    <div className="min-h-screen bg-white text-[#131A2E] overflow-x-hidden">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
      />

      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr] font-['Inter']">
        
        {/* LEFT — image side (Desktop/Tablet >= md) */}
        <div className="relative hidden overflow-hidden bg-[#232E82] md:block">
          <img
            src="https://images.unsplash.com/photo-1541976590-713941681591?q=80&w=1200&auto=format&fit=crop"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-95 grayscale contrast-125 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2F3FA6]/90 via-[#232E82]/75 to-[#131A2E]/55" />
          <div className="absolute inset-y-0 right-0 w-16 bg-white [clip-path:polygon(100%_0,100%_100%,0_100%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-14">
            <div className="flex items-center gap-2.5 font-['Space_Grotesk'] text-lg font-semibold tracking-tight text-white">
              <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[#F2994A]" />
              LaborConnect
            </div>

            <div>
              <h1 className="mb-4 max-w-xs font-['Space_Grotesk'] text-4xl font-semibold leading-tight tracking-tight text-white">
                Where trusted work gets done.
              </h1>
              <p className="max-w-md text-[15px] leading-relaxed text-white/80">
                Sign in to reach vetted tradespeople and skilled crews,
                manage jobs, and keep every project moving.
              </p>

              <div className="mt-9 flex flex-wrap gap-6 lg:gap-9">
                <div className="border-l-2 border-white/35 pl-3.5">
                  <b className="block font-['Space_Grotesk'] text-xl font-semibold text-white">
                    12k+
                  </b>
                  <span className="text-xs text-white/65">Verified pros</span>
                </div>
                <div className="border-l-2 border-white/35 pl-3.5">
                  <b className="block font-['Space_Grotesk'] text-xl font-semibold text-white">
                    98%
                  </b>
                  <span className="text-xs text-white/65">
                    Jobs completed on time
                  </span>
                </div>
                <div className="border-l-2 border-white/35 pl-3.5">
                  <b className="block font-['Space_Grotesk'] text-xl font-semibold text-white">
                    4.8/5
                  </b>
                  <span className="text-xs text-white/65">
                    Average rating
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — sign-in side */}
        <div className="flex min-h-screen items-center justify-center p-5 sm:p-8 md:p-12">
          <div className="w-full max-w-sm">
            
            {/* Mobile-only brand logo */}
            <div className="mb-8 flex items-center gap-2.5 font-['Space_Grotesk'] text-xl font-bold tracking-tight text-[#131A2E] md:hidden">
              <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[#F2994A]" />
              LaborConnect
            </div>

            <div className="mb-6 sm:mb-7 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-[#6B7191]">
              <span>New to LaborConnect?</span>
              <button
                type="button"
                onClick={() => (openSignUp ? openSignUp() : openSignIn())}
                className="font-medium text-[#2F3FA6] hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </div>

            <h2 className="mb-2 font-['Space_Grotesk'] text-[27px] font-semibold tracking-tight">
              Sign in
            </h2>
            <p className="mb-6 sm:mb-8 text-[14.5px] leading-relaxed text-[#6B7191]">
              Pick up where you left off — your jobs, messages, and quotes
              are waiting.
            </p>

            <button
              type="button"
              onClick={() => openSignIn()}
              className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-br from-[#2F3FA6] to-[#1B2470] px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:-translate-y-px hover:shadow-lg hover:shadow-[#2F3FA6]/30 active:translate-y-0 cursor-pointer"
            >
              <span className="pointer-events-none absolute inset-y-0 left-[-40%] w-[35%] -skew-x-[20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-all duration-500 group-hover:left-[120%]" />
              <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px] shrink-0">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.6" opacity="0.35" />
                <path
                  d="M9 12l2 2 4-4.5"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Continue
            </button>

            <div className="my-5 sm:my-6 flex items-center gap-3 text-xs text-[#6B7191]">
              <span className="h-px flex-1 bg-[#E3E6F2]" />
              or
              <span className="h-px flex-1 bg-[#E3E6F2]" />
            </div>

            <button
              type="button"
              onClick={() => openSignIn()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E3E6F2] bg-white py-3 text-[14.5px] font-medium text-[#131A2E] transition hover:border-[#2F3FA6] hover:bg-[#EEF1FA] cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M4 4h16v16H4V4z" stroke="#6B7191" strokeWidth="1.5" />
                <path d="M4 6l8 7 8-7" stroke="#6B7191" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Continue with email
            </button>

            <p className="mt-6 sm:mt-7 text-xs leading-relaxed text-[#6B7191]">
              By continuing, you agree to LaborConnect's{" "}
              <a href="#" className="text-[#2F3FA6] no-underline hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#2F3FA6] no-underline hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}