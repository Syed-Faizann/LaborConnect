// frontend/src/pages/CompanyRegistration.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Clock3 } from "lucide-react";
import { Button } from "../components/ui/button";
import { StepSidebar } from "../components/StepBar";
import { CompanyInfoStep } from "../components/steps/CompanyInfoStep";
import { BusinessDetailsStep } from "../components/steps/BusinessDetailsStep";
import { ServicesStep } from "../components/steps/ServicesStep";
import { DocumentsStep } from "../components/steps/DocumentsStep";
import { registerCompany, getPublicPlatformSettings } from "../services/api";

const steps = [
  { id: "company-info", number: 1, title: "Company Info", description: "Logo, Name, Phone" },
  { id: "business-details", number: 2, title: "Business Details", description: "Entity, EIN & HQ" },
  { id: "services", number: 3, title: "Specialties & Area", description: "Coverage & Specialties" },
  { id: "documents", number: 4, title: "Documents", description: "Licenses & Registration" },
];

const initialFormData = {
  legalName: "Acme Construction LLC",
  phone: "(555) 123-4567",
  email: "contact@acme.com",
  website: "",
  logoFile: null,

  entityType: "llc",
  ein: "84-2910482",
  yearEstablished: "2016",
  employeeRange: "6-20",

  // Headquarters Address Fields
  mainAddress: "Al-Rehman Plaza, Canal Road",
  city: "Faisalabad",
  state: "Punjab",
  country: "Pakistan",
  hqLocation: "Al-Rehman Plaza, Canal Road, Faisalabad, Punjab, Pakistan",

  specialties: ["Emergency Pipe Repair", "Commercial Drainage", "Water Line Installation", "Leak Detection"],
  coverageRadius: 35,

  tradeLicenseFile: null,
  licenseNumber: "MP-7890214-8",
  licenseExpiration: "11/30/2026",
  coiFile: null,
  workersCompExempt: false,
  certify: true,
};

export function CompanyRegistration() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [platformSettings, setPlatformSettings] = useState(null);
  const [checkingSettings, setCheckingSettings] = useState(true);

  const isFirst = currentStep === 1;
  const isLast = currentStep === steps.length;
  const navigate = useNavigate();
  const { getToken } = useAuth();

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getPublicPlatformSettings();
        setPlatformSettings(data);
      } catch (err) {
        console.warn("Failed to fetch public platform settings:", err);
      } finally {
        setCheckingSettings(false);
      }
    }
    loadSettings();
  }, []);

  const isQueueOpen = platformSettings?.acceptRegistrations !== false;
  const supportEmail = platformSettings?.supportEmail || "support@laborconnect.com";

  function updateFields(fields) {
    setFormData((prev) => ({ ...prev, ...fields }));
  }

  function handleBack() {
    if (!isFirst) {
      setError("");
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleNext() {
    if (!isQueueOpen) return;
    setError("");

    // Step 1 Validation
    if (currentStep === 1) {
      if (!formData.legalName?.trim()) {
        setError("Legal Company Name is required.");
        return;
      }
      if (!formData.phone?.trim()) {
        setError("Primary Phone Number is required.");
        return;
      }
      if (!formData.email?.trim()) {
        setError("Business Email is required.");
        return;
      }
    }

    // Step 2 Validation
    if (currentStep === 2) {
      const isEinRequired = platformSettings?.requireEin !== false;
      if (isEinRequired && !formData.ein?.trim()) {
        setError("Federal Tax ID (EIN) is required.");
        return;
      }
      if (!formData.yearEstablished?.trim()) {
        setError("Year Established is required.");
        return;
      }
      if (!formData.city?.trim() && !formData.hqLocation?.trim()) {
        setError("Headquarters City is required.");
        return;
      }

      if (!formData.country || !formData.country.trim()) {
        formData.country = "Pakistan";
        updateFields({ country: "Pakistan" });
      }
    }

    // Step 3 Validation
    if (currentStep === 3) {
      if (!formData.specialties || formData.specialties.length === 0) {
        setError("Please add at least one trade specialty.");
        return;
      }
    }

    if (!isLast) {
      setError("");
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    await handleSubmit();
  }

  async function handleSubmit() {
    if (!isQueueOpen) return;
    setError("");

    // Step 4 Validation
    const isLicenseRequired = platformSettings?.requireTradeLicense !== false;
    const isInsuranceRequired = platformSettings?.requireInsurance !== false;

    if (isLicenseRequired && !formData.tradeLicenseFile) {
      setError("Please upload your Trade License file.");
      return;
    }

    if (isInsuranceRequired && !formData.coiFile) {
      setError("Please upload your Certificate of Insurance (COI) file.");
      return;
    }

    if (!formData.certify) {
      setError("You must certify that the provided documentation is authentic.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();

      const countryVal = formData.country?.trim() || "Pakistan";
      const fullHqLocation =
        [formData.mainAddress, formData.city, formData.state, countryVal]
          .filter(Boolean)
          .join(", ") || formData.hqLocation;

      const fd = new FormData();
      fd.append("legalName", formData.legalName);
      fd.append("phone", formData.phone);
      fd.append("email", formData.email);
      if (formData.website) fd.append("website", formData.website);

      fd.append("entityType", formData.entityType);
      fd.append("ein", formData.ein);
      fd.append("yearEstablished", formData.yearEstablished);
      fd.append("employeeRange", formData.employeeRange);

      fd.append("mainAddress", formData.mainAddress || "");
      fd.append("street", formData.mainAddress || "");
      fd.append("city", formData.city || "");
      fd.append("state", formData.state || "");
      fd.append("country", countryVal);
      fd.append("hqLocation", fullHqLocation);

      fd.append("specialties", JSON.stringify(formData.specialties || []));
      fd.append("coverageRadius", formData.coverageRadius || 25);

      fd.append("licenseNumber", formData.licenseNumber);
      fd.append("licenseExpiration", formData.licenseExpiration);
      fd.append("workersCompExempt", formData.workersCompExempt);
      fd.append("certify", formData.certify);

      if (formData.logoFile) fd.append("logo", formData.logoFile);
      if (formData.tradeLicenseFile) fd.append("tradeLicenseFile", formData.tradeLicenseFile);
      if (formData.coiFile) fd.append("coiFile", formData.coiFile);

      await registerCompany(fd, token);
      navigate("/company-dashboard");
    } catch (err) {
      setError(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div onClick={() => navigate("/")} className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
          <span className="text-lg sm:text-xl font-bold tracking-tight text-primary">Labor</span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Connect</span>
        </div>
        {supportEmail && (
          <a
            href={`mailto:${supportEmail}`}
            className="text-[11px] sm:text-xs text-muted-foreground hover:text-foreground truncate max-w-[200px] sm:max-w-none"
          >
            Support: {supportEmail}
          </a>
        )}
      </header>

      {!checkingSettings && !isQueueOpen && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 sm:px-6 sm:py-3 text-center text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
          <Clock3 className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Contractor registrations are currently paused by the platform administrator.
          </span>
        </div>
      )}

      <main className="flex flex-1 items-start justify-center px-3 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl grid-cols-1 gap-6 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm lg:grid-cols-[320px_1fr] lg:p-0">
          
          {/* Sidebar Area */}
          <div className="border-b border-border pb-5 lg:border-b-0 lg:border-r lg:p-8">
            <StepSidebar steps={steps} currentStep={currentStep} />
          </div>

          {/* Form Step Content */}
          <div className="flex flex-col p-2 sm:p-6 lg:p-8">
            <div className="flex-1">
              {currentStep === 1 && (
                <CompanyInfoStep
                  data={formData}
                  onChange={updateFields}
                  settings={platformSettings}
                />
              )}
              {currentStep === 2 && (
                <BusinessDetailsStep
                  data={formData}
                  onChange={updateFields}
                  settings={platformSettings}
                />
              )}
              {currentStep === 3 && (
                <ServicesStep
                  data={formData}
                  onChange={updateFields}
                  settings={platformSettings}
                />
              )}
              {currentStep === 4 && (
                <DocumentsStep
                  data={formData}
                  onChange={updateFields}
                  settings={platformSettings}
                />
              )}
            </div>

            {error && <p className="mt-4 text-xs sm:text-sm text-destructive font-medium">{error}</p>}

            <div className="mt-6 sm:mt-8 flex items-center justify-between border-t border-border pt-4 sm:pt-6 gap-3">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isFirst || submitting}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={submitting || !isQueueOpen}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm ${
                  !isQueueOpen ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {!isQueueOpen ? (
                  "Registrations Paused"
                ) : submitting ? (
                  "Submitting..."
                ) : isLast ? (
                  <>
                    <span className="hidden sm:inline">Submit Application for Review</span>
                    <span className="sm:hidden">Submit Application</span>
                  </>
                ) : (
                  "Next Step"
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        LaborConnect © 2026 · Verified Contractor Network · Privacy &amp; Terms
      </footer>
    </div>
  );
}