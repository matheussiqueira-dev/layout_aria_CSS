const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^a-zA-Z0-9]/, "Password must include a special character");

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(180),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(1).max(72),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(16).max(512),
});

const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  sessionIdParamsSchema,
};
