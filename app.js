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

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.options("*", cors());
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
