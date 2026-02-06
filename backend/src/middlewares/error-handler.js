const { AppError } = require("../core/errors");

function errorHandler(err, req, res, next) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : "INTERNAL_ERROR";

  req.log?.error(
    {
      err,
      requestId: req.context?.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      code,
    },
    "Request failed"
  );

  const payload = {
    error: {
      code,
      message: isAppError ? err.message : "Unexpected server error",
      details: isAppError ? err.details : null,
      requestId: req.context?.requestId || null,
    },
  };

  if (!isAppError && process.env.NODE_ENV !== "production") {
    payload.error.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = { errorHandler };
