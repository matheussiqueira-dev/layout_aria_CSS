const express = require("express");
const { asyncHandler } = require("../../core/async-handler");

function memoryUsageMb() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / (1024 * 1024)),
    heapUsed: Math.round(usage.heapUsed / (1024 * 1024)),
    heapTotal: Math.round(usage.heapTotal / (1024 * 1024)),
  };
}

function createHealthRouter(store, startedAt) {
  const router = express.Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      res.status(200).json({
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt,
        timestamp: new Date().toISOString(),
        memoryMb: memoryUsageMb(),
      });
    })
  );

  router.get(
    "/ready",
    asyncHandler(async (req, res) => {
      await store.read();
      res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString(),
      });
    })
  );

  return router;
}

module.exports = {
  createHealthRouter,
};
