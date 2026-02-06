const { forbidden } = require("../core/errors");

function authorize(allowedRoles) {
  return function authorizeMiddleware(req, res, next) {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return next(forbidden("Insufficient permissions"));
    }

    return next();
  };
}

module.exports = {
  authorize,
};
