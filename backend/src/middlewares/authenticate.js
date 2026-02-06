const { verifyAccessToken } = require("../core/token");
const { unauthorized } = require("../core/errors");

function parseBearerToken(header) {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function authenticate(req, res, next) {
  const token = parseBearerToken(req.header("authorization"));

  if (!token) {
    return next(unauthorized("Missing Bearer token"));
  }

  const payload = verifyAccessToken(token);
  req.user = {
    id: payload.sub,
    role: payload.role,
    email: payload.email,
    sessionId: payload.sid || null,
  };

  return next();
}

module.exports = {
  authenticate,
};
