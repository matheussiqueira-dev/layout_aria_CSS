const { notFound } = require("../core/errors");

function notFoundMiddleware(req, res, next) {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

module.exports = { notFoundMiddleware };
