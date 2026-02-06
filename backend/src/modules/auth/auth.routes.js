const express = require("express");
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  sessionIdParamsSchema,
} = require("./auth.schemas");
const { validate } = require("../../core/validation");
const { asyncHandler } = require("../../core/async-handler");
const { authenticate } = require("../../middlewares/authenticate");
const { createRateLimiter } = require("../../core/rate-limit");
const { env } = require("../../config/env");

function createAuthRouter(authService) {
  const router = express.Router();

  const authLimiter = createRateLimiter({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitAuthMax,
    keyFn: (req) => `${req.ip}:${req.path}`,
    message: "Too many authentication attempts",
  });

  router.post(
    "/register",
    authLimiter,
    validate(registerSchema),
    asyncHandler(async (req, res) => {
      const result = await authService.register(req.body, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(201).json(result);
    })
  );

  router.post(
    "/login",
    authLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const result = await authService.login(req.body, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(200).json(result);
    })
  );

  router.get(
    "/me",
    authenticate,
    asyncHandler(async (req, res) => {
      const user = await authService.me(req.user.id);
      res.status(200).json({ user });
    })
  );

  router.post(
    "/refresh",
    authLimiter,
    validate(refreshTokenSchema),
    asyncHandler(async (req, res) => {
      const result = await authService.refreshToken(req.body.refreshToken, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(200).json(result);
    })
  );

  router.post(
    "/logout",
    validate(refreshTokenSchema),
    asyncHandler(async (req, res) => {
      const result = await authService.logout(req.body.refreshToken, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(200).json(result);
    })
  );

  router.post(
    "/logout-all",
    authenticate,
    asyncHandler(async (req, res) => {
      const result = await authService.logoutAll(req.user.id, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(200).json(result);
    })
  );

  router.get(
    "/sessions",
    authenticate,
    asyncHandler(async (req, res) => {
      const result = await authService.listSessions(req.user.id, req.user.sessionId || null);
      res.status(200).json(result);
    })
  );

  router.delete(
    "/sessions/:sessionId",
    authenticate,
    validate(sessionIdParamsSchema, "params"),
    asyncHandler(async (req, res) => {
      const result = await authService.revokeSession(
        req.user.id,
        req.params.sessionId,
        req.user.sessionId || null,
        {
          ip: req.ip,
          userAgent: req.header("user-agent"),
        }
      );

      res.status(200).json(result);
    })
  );

  return router;
}

module.exports = {
  createAuthRouter,
};
