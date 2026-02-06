const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const pinoHttp = require("pino-http");

const { env } = require("./config/env");
const { logger } = require("./core/logger");
const { createRateLimiter } = require("./core/rate-limit");
const { requestContextMiddleware } = require("./middlewares/request-context");
const { notFoundMiddleware } = require("./middlewares/not-found");
const { errorHandler } = require("./middlewares/error-handler");
const { JsonDataStore } = require("./infrastructure/storage/data-store");
const { seedInitialData } = require("./infrastructure/storage/seed");

const { AuthService } = require("./modules/auth/auth.service");
const { LayoutService } = require("./modules/layouts/layout.service");
const { AdminService } = require("./modules/admin/admin.service");

const { createAuthRouter } = require("./modules/auth/auth.routes");
const { createLayoutsRouter } = require("./modules/layouts/layout.routes");
const { createAdminRouter } = require("./modules/admin/admin.routes");
const { createHealthRouter } = require("./modules/health/health.routes");
const { createDocsRouter } = require("./modules/docs/docs.routes");
const { createMetricsRouter } = require("./modules/metrics/metrics.routes");

function createCorsOptions() {
  const allowedOrigins = new Set(env.corsOrigin);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy blocked this origin"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    credentials: false,
    maxAge: 86400,
  };
}

async function createApp(options = {}) {
  const startedAt = new Date().toISOString();
  const dataFilePath = options.dataFilePath || env.dataFile;
  const openApiFilePath = options.openApiFilePath || path.resolve(process.cwd(), "openapi.yaml");

  const store = options.store || new JsonDataStore(dataFilePath, logger);
  await store.init();
  await seedInitialData(store, logger, {
    adminEmail: process.env.SEED_ADMIN_EMAIL,
    adminPassword: process.env.SEED_ADMIN_PASSWORD,
  });

  const authService = new AuthService(store, {
    refreshTokenTtlDays: options.refreshTokenTtlDays ?? env.refreshTokenTtlDays,
    maxActiveSessions: options.authMaxActiveSessions ?? env.authMaxActiveSessions,
  });
  const layoutService = new LayoutService(store, {
    publicCacheTtlMs: options.publicCacheTtlMs ?? env.publicCacheTtlMs,
  });
  const adminService = new AdminService(store);

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestContextMiddleware);
  app.use(
    pinoHttp({
      logger,
      customSuccessMessage: () => "request completed",
      customErrorMessage: () => "request errored",
      customProps: (req) => ({ requestId: req.context?.requestId }),
    })
  );

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(cors(createCorsOptions()));
  app.use(compression({ threshold: 1024 }));

  app.use(express.json({ limit: "40kb", strict: true }));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));

  const apiLimiter = createRateLimiter({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    keyFn: (req) => req.ip || "unknown",
    message: "Rate limit exceeded",
    skipFn: (req) => req.path.startsWith("/api/v1/health") || req.path.startsWith("/health"),
  });

  app.use(apiLimiter);

  const healthRouter = createHealthRouter(store, startedAt);

  app.get("/", (req, res) => {
    res.status(200).json({
      name: "layout_aria_CSS backend",
      version: "v1",
      status: "ok",
      docs: "/api/v1/docs",
      health: "/api/v1/health",
    });
  });

  app.use("/health", healthRouter);
  app.use("/api/v1/health", healthRouter);

  app.use("/api/v1/auth", createAuthRouter(authService));
  app.use("/api/v1/layouts", createLayoutsRouter(layoutService));
  app.use("/api/v1/admin", createAdminRouter(adminService));
  app.use("/api/v1/docs", createDocsRouter(openApiFilePath));
  app.use("/api/v1/metrics", createMetricsRouter(store, startedAt));

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  app.locals.store = store;
  app.locals.services = {
    authService,
    layoutService,
    adminService,
  };

  return app;
}

module.exports = {
  createApp,
};
