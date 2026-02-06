const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../../middlewares/authenticate");
const { optionalAuthenticate } = require("../../middlewares/optional-authenticate");
const { validateRequest } = require("../../core/validation");
const { asyncHandler } = require("../../core/async-handler");
const {
  createLayoutSchema,
  updateLayoutSchema,
  listLayoutsQuerySchema,
  listPublicTagsQuerySchema,
  layoutIdParamsSchema,
  revisionParamsSchema,
  publishLayoutSchema,
  listRevisionsQuerySchema,
  restoreLayoutSchema,
} = require("./layout.schemas");

const listMineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

function createLayoutsRouter(layoutService) {
  const router = express.Router();

  router.get(
    "/public/tags",
    validateRequest({ query: listPublicTagsQuerySchema }),
    asyncHandler(async (req, res) => {
      const result = await layoutService.listPublicTags(req.query);
      res.status(200).json(result);
    })
  );

  router.get(
    "/public",
    validateRequest({ query: listLayoutsQuerySchema }),
    asyncHandler(async (req, res) => {
      const result = await layoutService.listPublic(req.query);
      res.status(200).json(result);
    })
  );

  router.get(
    "/mine",
    authenticate,
    validateRequest({ query: listMineQuerySchema }),
    asyncHandler(async (req, res) => {
      const result = await layoutService.listMine(req.user, req.query);
      res.status(200).json(result);
    })
  );

  router.get(
    "/:id",
    optionalAuthenticate,
    validateRequest({ params: layoutIdParamsSchema }),
    asyncHandler(async (req, res) => {
      const layout = await layoutService.getById(req.params.id, req.user || null);
      res.status(200).json({ layout });
    })
  );

  router.get(
    "/:id/revisions",
    authenticate,
    validateRequest({ params: layoutIdParamsSchema, query: listRevisionsQuerySchema }),
    asyncHandler(async (req, res) => {
      const result = await layoutService.listRevisions(req.params.id, req.user, req.query);
      res.status(200).json(result);
    })
  );

  router.get(
    "/:id/revisions/:revisionId",
    authenticate,
    validateRequest({ params: revisionParamsSchema }),
    asyncHandler(async (req, res) => {
      const revision = await layoutService.getRevisionById(
        req.params.id,
        req.params.revisionId,
        req.user
      );

      res.status(200).json({ revision });
    })
  );

  router.post(
    "/",
    authenticate,
    validateRequest({ body: createLayoutSchema }),
    asyncHandler(async (req, res) => {
      const layout = await layoutService.create(req.body, req.user, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(201).json({ layout });
    })
  );

  router.patch(
    "/:id",
    authenticate,
    validateRequest({ params: layoutIdParamsSchema, body: updateLayoutSchema }),
    asyncHandler(async (req, res) => {
      const layout = await layoutService.update(req.params.id, req.body, req.user, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(200).json({ layout });
    })
  );

  router.delete(
    "/:id",
    authenticate,
    validateRequest({ params: layoutIdParamsSchema }),
    asyncHandler(async (req, res) => {
      const result = await layoutService.remove(req.params.id, req.user, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(200).json(result);
    })
  );

  router.post(
    "/:id/publish",
    authenticate,
    validateRequest({ params: layoutIdParamsSchema, body: publishLayoutSchema }),
    asyncHandler(async (req, res) => {
      const layout = await layoutService.setPublishStatus(
        req.params.id,
        req.body.isPublic,
        req.body.expectedVersion,
        req.user,
        {
          ip: req.ip,
          userAgent: req.header("user-agent"),
        }
      );

      res.status(200).json({ layout });
    })
  );

  router.post(
    "/:id/star",
    authenticate,
    validateRequest({ params: layoutIdParamsSchema }),
    asyncHandler(async (req, res) => {
      const result = await layoutService.toggleStar(req.params.id, req.user, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(200).json(result);
    })
  );

  router.post(
    "/:id/clone",
    authenticate,
    validateRequest({ params: layoutIdParamsSchema }),
    asyncHandler(async (req, res) => {
      const layout = await layoutService.clone(req.params.id, req.user, {
        ip: req.ip,
        userAgent: req.header("user-agent"),
      });

      res.status(201).json({ layout });
    })
  );

  router.post(
    "/:id/restore",
    authenticate,
    validateRequest({ params: layoutIdParamsSchema, body: restoreLayoutSchema }),
    asyncHandler(async (req, res) => {
      const layout = await layoutService.restoreRevision(
        req.params.id,
        req.body.revisionId,
        req.body.expectedVersion,
        req.user,
        {
          ip: req.ip,
          userAgent: req.header("user-agent"),
        }
      );

      res.status(200).json({ layout });
    })
  );

  return router;
}

module.exports = {
  createLayoutsRouter,
};
