const crypto = require("node:crypto");

function requestContextMiddleware(req, res, next) {
  const requestId = req.header("x-request-id") || crypto.randomUUID();
  const startedAt = Date.now();

  req.context = {
    requestId,
    startedAt,
  };

  res.setHeader("x-request-id", requestId);
  res.on("finish", () => {
    req.log?.info(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      "Request completed"
    );
  });

  next();
}

module.exports = { requestContextMiddleware };
