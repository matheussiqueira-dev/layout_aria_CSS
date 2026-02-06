const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../../middlewares/authenticate");
const { authorize } = require("../../middlewares/authorize");
const { validateRequest } = require("../../core/validation");
const { asyncHandler } = require("../../core/async-handler");

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const auditQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().max(80).optional().default(""),
  actorId: z.string().uuid().optional(),
});

function createAdminRouter(adminService) {
  const router = express.Router();

  router.use(authenticate, authorize(["admin"]));

  router.get(
    "/stats",
    asyncHandler(async (req, res) => {
      const stats = await adminService.getSystemStats();
      res.status(200).json({ stats });
    })
  );

  router.get(
    "/users",
    validateRequest({ query: paginationQuerySchema }),
    asyncHandler(async (req, res) => {
      const result = await adminService.listUsers(req.query);
      res.status(200).json(result);
    })
  );

  router.get(
    "/audit",
    validateRequest({ query: auditQuerySchema }),
    asyncHandler(async (req, res) => {
      const result = await adminService.listAuditLogs(req.query);
      res.status(200).json(result);
    })
  );

  return router;
}

module.exports = {
  createAdminRouter,
};
