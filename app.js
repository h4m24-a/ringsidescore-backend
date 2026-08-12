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
  origin: (origin, callback) => {
    const allowedOrigins = [process.env.CLIENT_ORIGIN, "https://ringsidescore.com"];
    // allow no-origin requests (curl, server-to-server, some mobile clients)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`); // temporary — helps confirm what's actually arriving
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // explicit preflight handling — don't rely on it being automatic;

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
