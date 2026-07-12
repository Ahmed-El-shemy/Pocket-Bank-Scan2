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
const NODE_ENV = process.env.NODE_ENV ?? "development";

// ── CORS ────────────────────────────────────────────────────────────────────
// In production, restrict to known frontend origins.
// In development, allow localhost origins.
const allowedOrigins = (() => {
  const origins: string[] = [];

  // Explicit whitelist from env (comma-separated)
  if (process.env.FRONTEND_URL) {
    origins.push(
      ...process.env.FRONTEND_URL.split(",").map((u) => u.trim()).filter(Boolean),
    );
  }

  // Always allow localhost during development
  if (NODE_ENV !== "production") {
    origins.push("http://localhost:5173", "http://localhost:3000", "http://localhost:4173");
  }

  return origins;
})();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "25mb" }));

// ── Production logging middleware ───────────────────────────────────────────
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ── File upload config ──────────────────────────────────────────────────────
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

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "check-scanner-backend",
    environment: NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Keep the old path for backwards compatibility
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ── Analyze check endpoint ──────────────────────────────────────────────────
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
        console.error("[analyze-check] Azure credentials missing from environment.");
        return res.status(500).json({
          error:
            "Azure credentials missing. Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_API_KEY in environment variables.",
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

// ── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[${NODE_ENV}] Check scanner backend listening on port ${PORT}`);
});