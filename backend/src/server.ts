import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from "@azure/ai-form-recognizer";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg"]);
const MAX_BYTES = 20 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new Error("Only PNG, JPG, or JPEG images are allowed."));
      return;
    }
    cb(null, true);
  },
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/analyze-check",
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        const status = (err as { code?: string }).code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ error: (err as Error).message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded (field 'image')." });
      }

      const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
      const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY;
      if (!endpoint || !apiKey) {
        return res.status(500).json({
          error:
            "Azure credentials missing. Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_API_KEY in backend/.env.",
        });
      }

      const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
      const poller = await client.beginAnalyzeDocument("prebuilt-document", req.file.buffer);
      const result = await poller.pollUntilDone();

      // Return the raw Azure result JSON as-is.
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[analyze-check] failed:", message);
      res.status(500).json({ error: message });
    }
  },
);

app.listen(PORT, () => {
  console.log(`Check scanner backend listening on http://localhost:${PORT}`);
});