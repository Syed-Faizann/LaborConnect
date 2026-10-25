// backend/src/middleware/companyUpload.middleware.js
import multer from "multer";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const companyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isPdf = file.mimetype === "application/pdf";

    if (!isImage && !isPdf) {
      cb(new Error("Only image or PDF uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});