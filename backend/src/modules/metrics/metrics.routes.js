const express = require("express");
const { authenticate } = require("../../middlewares/authenticate");
const { authorize } = require("../../middlewares/authorize");
const { asyncHandler } = require("../../core/async-handler");

function createMetricsRouter(store, startedAt) {
  const router = express.Router();

  router.use(authenticate, authorize(["admin"]));

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const snapshot = await store.read();
      const nowMs = Date.now();

      const publicLayouts = snapshot.layouts.filter((layout) => layout.isPublic).length;
      const privateLayouts = snapshot.layouts.length - publicLayouts;
      const sessions = Array.isArray(snapshot.sessions) ? snapshot.sessions : [];
      const activeSessions = sessions.filter((session) => {
        if (session.revokedAt) {
          return false;
        }

        const expiresAtMs = new Date(session.expiresAt).getTime();
        return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
      }).length;

      res.status(200).json({
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt,
        timestamp: new Date().toISOString(),
        counters: {
          users: snapshot.users.length,
          sessions: sessions.length,
          activeSessions,
          layouts: snapshot.layouts.length,
          publicLayouts,
          privateLayouts,
          layoutRevisions: (snapshot.layoutRevisions || []).length,
          auditEvents: snapshot.auditLogs.length,
        },
        memoryMb: {
          rss: Math.round(process.memoryUsage().rss / (1024 * 1024)),
          heapUsed: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
          heapTotal: Math.round(process.memoryUsage().heapTotal / (1024 * 1024)),
        },
      });
    })
  );

  return router;
}

module.exports = {
  createMetricsRouter,
};
