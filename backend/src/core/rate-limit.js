function createRateLimiter({ windowMs, max, keyFn, message, skipFn }) {
  const hits = new Map();

  function cleanup(now) {
    for (const [key, entry] of hits.entries()) {
      if (entry.expiresAt <= now) {
        hits.delete(key);
      }
    }
  }

  setInterval(() => cleanup(Date.now()), Math.max(1000, Math.floor(windowMs / 2))).unref();

  return function rateLimiter(req, res, next) {
    if (skipFn && skipFn(req)) {
      return next();
    }

    const now = Date.now();
    const key = keyFn ? keyFn(req) : req.ip || "unknown";
    const existing = hits.get(key);

    if (!existing || existing.expiresAt <= now) {
      hits.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    existing.count += 1;

    if (existing.count > max) {
      const retryAfterSeconds = Math.ceil((existing.expiresAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: message || "Too many requests",
          retryAfterSeconds,
          requestId: req.context?.requestId || null,
        },
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
