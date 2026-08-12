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

app.use(helmet());
// Allow a comma-separated list in CLIENT_ORIGIN (e.g. "https://ringsidescore.com,http://localhost:5173")
const rawOrigins = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigins = rawOrigins.split(",").map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // no origin means same-origin or server-to-server request (allow)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
  })
);
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
