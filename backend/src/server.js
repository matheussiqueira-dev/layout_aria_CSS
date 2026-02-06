const { createApp } = require("./app");
const { env } = require("./config/env");
const { logger } = require("./core/logger");

async function startServer() {
  const app = await createApp();
  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, nodeEnv: env.nodeEnv }, "Backend API listening");
  });

  function shutdown(signal) {
    logger.info({ signal }, "Shutdown signal received");
    server.close((error) => {
      if (error) {
        logger.error({ err: error }, "Error closing server");
        process.exit(1);
      }

      logger.info("Server stopped");
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  logger.error({ err: error }, "Failed to start backend API");
  process.exit(1);
});
