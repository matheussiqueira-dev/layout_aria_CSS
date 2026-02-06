const { verifyAccessToken } = require("../core/token");

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

function optionalAuthenticate(req, res, next) {
  const token = parseBearerToken(req.header("authorization"));

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      sessionId: payload.sid || null,
    };
  } catch {
    req.user = null;
  }

  return next();
}

module.exports = {
  optionalAuthenticate,
};
