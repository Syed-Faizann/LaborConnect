// frontend/src/components/StepBar.jsx
import { Check } from "lucide-react";
import { cn } from "../lib/util";

export function StepSidebar({ steps, currentStep }) {
  const currentStepObj = steps.find((s) => s.number === currentStep) || steps[0];

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      
      {/* Title */}
      <div className="px-1 sm:px-2">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
          Register Your Company
        </h2>
        {/* Mobile-only active step subtitle */}
        <p className="text-xs text-muted-foreground mt-0.5 lg:hidden">
          Step {currentStep} of {steps.length}: <span className="font-semibold text-primary">{currentStepObj.title}</span>
        </p>
      </div>

      {/* MOBILE COMPACT STEP INDICATOR (< lg) */}
      <div className="flex items-center justify-between gap-2 px-1 lg:hidden">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <div key={step.id} className="flex-1 flex items-center gap-1.5 sm:gap-2">
              <div
                className={cn(
                  "flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "border-border bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : step.number}
              </div>

              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* DESKTOP VERTICAL TIMELINE (>= lg) - Exact full-screen styling */}
      <div className="relative hidden lg:flex flex-col gap-0">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isPending = currentStep < step.number;

          return (
            <div key={step.id} className="group relative flex gap-4">
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[19px] top-10 h-[calc(100%-16px)] w-0.5",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}

              {/* Step indicator */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  isPending && "border-border bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : step.number}
              </div>

              {/* Step text */}
              <div className="flex flex-col justify-center pb-8">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isPending ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {step.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}