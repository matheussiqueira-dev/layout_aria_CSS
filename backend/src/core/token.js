const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { unauthorized } = require("./errors");

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: env.jwtExpiresIn,
  });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
    });
  } catch {
    throw unauthorized("Invalid or expired token");
  }
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
