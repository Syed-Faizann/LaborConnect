// backend/src/routes/company.route.js
import express from "express";
import { registerCompany, getMyCompanyStatus } from "../controllers/company.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { companyUpload } from "../middleware/companyUpload.middleware.js";

const router = express.Router();
router.use(protectRoute);

router.post(
  "/create",
  companyUpload.fields([
    // Support both "logo" and "logoFile"
    { name: "logo", maxCount: 1 },
    { name: "logoFile", maxCount: 1 },

    // Support both "tradeLicenseFile" and "tradeLicense"
    { name: "tradeLicenseFile", maxCount: 1 },
    { name: "tradeLicense", maxCount: 1 },

    // Support both "coiFile" and "coiCertificate"
    { name: "coiFile", maxCount: 1 },
    { name: "coiCertificate", maxCount: 1 },
  ]),
  registerCompany
);

router.get("/me/status", getMyCompanyStatus);

export default router;