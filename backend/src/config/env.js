const path = require("node:path");
const fs = require("node:fs");
const dotenv = require("dotenv");

const explicitEnvFile = process.env.ENV_FILE;
const defaultEnvFile = path.resolve(process.cwd(), ".env");

if (explicitEnvFile && fs.existsSync(explicitEnvFile)) {
  dotenv.config({ path: explicitEnvFile });
} else if (fs.existsSync(defaultEnvFile)) {
  dotenv.config({ path: defaultEnvFile });
} else {
  dotenv.config();
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toInt(process.env.PORT, 4000),
  logLevel: process.env.LOG_LEVEL || "info",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  corsOrigin: toList(process.env.CORS_ORIGIN || "http://localhost:8080,http://127.0.0.1:5500,http://localhost:5500,http://localhost:3000,http://localhost:5000"),
  dataFile: path.resolve(process.cwd(), process.env.DATA_FILE || "./data/db.json"),
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 120),
  rateLimitAuthMax: toInt(process.env.RATE_LIMIT_AUTH_MAX, 20),
  publicCacheTtlMs: toInt(process.env.PUBLIC_CACHE_TTL_MS, 15000),
  refreshTokenTtlDays: toInt(process.env.REFRESH_TOKEN_TTL_DAYS, 14),
  authMaxActiveSessions: toInt(process.env.AUTH_MAX_ACTIVE_SESSIONS, 5),
};

if (env.nodeEnv === "production" && env.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}

module.exports = { env };
