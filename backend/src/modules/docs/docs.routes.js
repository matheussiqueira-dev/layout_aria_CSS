const express = require("express");
const path = require("node:path");

function createDocsRouter(openApiFilePath) {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.status(200).json({
      name: "layout_aria_CSS backend API",
      version: "v1",
      openApiUrl: "/api/v1/docs/openapi.yaml",
      healthUrl: "/api/v1/health",
    });
  });

  router.get("/openapi.yaml", (req, res) => {
    res.type("application/yaml");
    res.sendFile(path.resolve(openApiFilePath));
  });

  return router;
}

module.exports = {
  createDocsRouter,
};
