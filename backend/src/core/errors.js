class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = options.statusCode || 500;
    this.code = options.code || "INTERNAL_ERROR";
    this.details = options.details || null;
    this.isOperational = options.isOperational !== false;
  }
}

function badRequest(message, details) {
  return new AppError(message, {
    statusCode: 400,
    code: "BAD_REQUEST",
    details,
  });
}

function unauthorized(message = "Authentication required") {
  return new AppError(message, {
    statusCode: 401,
    code: "UNAUTHORIZED",
  });
}

function forbidden(message = "You do not have permission") {
  return new AppError(message, {
    statusCode: 403,
    code: "FORBIDDEN",
  });
}

function notFound(message = "Resource not found") {
  return new AppError(message, {
    statusCode: 404,
    code: "NOT_FOUND",
  });
}

function conflict(message = "Resource already exists") {
  return new AppError(message, {
    statusCode: 409,
    code: "CONFLICT",
  });
}

function validationError(details) {
  return new AppError("Validation failed", {
    statusCode: 422,
    code: "VALIDATION_ERROR",
    details,
  });
}

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
};
