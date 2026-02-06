const bcrypt = require("bcryptjs");

const COST_FACTOR = 12;

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, COST_FACTOR);
}

async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
