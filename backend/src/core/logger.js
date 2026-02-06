const pino = require("pino");
const { env } = require("../config/env");

const logger = pino({
  level: env.logLevel,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = { logger };
