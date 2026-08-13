require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const passport = require("./middleware/passport"); // registers the jwt strategy
const errorHandler = require("./middleware/errorHandler");
const { globalLimiter } = require('./middleware/rateLimiter')
const routes = require("./routes");

const app = express();

app.set("trust proxy", 1);

// CORS options: support comma-separated list in CLIENT_ORIGINS or a single
// CLIENT_ORIGIN. When none provided, reflect incoming Origin for debugging
// (useful in local dev). Credentials are enabled so cookies work with the
// frontend when `fetch(..., { credentials: 'include' })` is used.
const configuredOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server) which have no origin
    if (!origin) return callback(null, true);
    // If no origins configured, reflect the request origin (debugging/dev)
    if (configuredOrigins.length === 0) return callback(null, origin);
    // Allow if origin is in the allow-list
    if (configuredOrigins.includes(origin)) return callback(null, true);
    // Otherwise reject
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

if (configuredOrigins.length > 0) console.log("Allowed CORS origins:", configuredOrigins);
else console.log("No CLIENT_ORIGIN(S) set — reflecting incoming Origin for CORS (dev only)");

// Log incoming origin for diagnostics
app.use((req, res, next) => {
  if (req.headers.origin) console.log("REQ ORIGIN:", req.method, req.originalUrl, req.headers.origin);
  next();
});

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// static assets — fighter photos, belt art, etc.
app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use(globalLimiter)

app.use("/api", routes);

app.use((req, res) => res.status(404).json({ message: "Not found" }));
app.use(errorHandler); // must be last

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Ringside API listening on port ${PORT}`));
