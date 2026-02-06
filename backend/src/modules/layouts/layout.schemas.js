const { z } = require("zod");

const layoutConfigSchema = z.object({
  direction: z.enum(["row", "row-reverse", "column", "column-reverse"]),
  justifyContent: z.enum([
    "flex-start",
    "flex-end",
    "center",
    "space-between",
    "space-around",
    "space-evenly",
  ]),
  alignItems: z.enum(["flex-start", "flex-end", "center", "stretch", "baseline"]),
  alignContent: z.enum([
    "flex-start",
    "flex-end",
    "center",
    "stretch",
    "space-between",
    "space-around",
    "space-evenly",
  ]),
  wrap: z.enum(["nowrap", "wrap", "wrap-reverse"]),
  gapPx: z.number().int().min(0).max(56),
  minHeightVh: z.number().int().min(45).max(90),
  itemSizePx: z.number().int().min(88).max(220),
  itemCount: z.number().int().min(1).max(12),
  showIndex: z.boolean(),
  showAxes: z.boolean(),
});

const createLayoutSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(800).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional().default([]),
  config: layoutConfigSchema,
  isPublic: z.boolean().optional().default(false),
});

const updateLayoutSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(800).optional(),
    tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
    config: layoutConfigSchema.optional(),
    isPublic: z.boolean().optional(),
    expectedVersion: z.number().int().min(1).optional(),
  })
  .refine((value) => {
    return ["name", "description", "tags", "config", "isPublic"].some(
      (field) => value[field] !== undefined
    );
  }, {
    message: "At least one mutable field must be provided",
  });

const listLayoutsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  search: z.string().trim().max(120).optional().default(""),
  tag: z.string().trim().max(24).optional().default(""),
  sort: z.enum(["recent", "popular"]).optional().default("recent"),
});

const listPublicTagsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const layoutIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const revisionParamsSchema = z.object({
  id: z.string().uuid(),
  revisionId: z.string().uuid(),
});

const publishLayoutSchema = z.object({
  isPublic: z.boolean(),
  expectedVersion: z.number().int().min(1).optional(),
});

const listRevisionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

const restoreLayoutSchema = z.object({
  revisionId: z.string().uuid(),
  expectedVersion: z.number().int().min(1).optional(),
});

module.exports = {
  layoutConfigSchema,
  createLayoutSchema,
  updateLayoutSchema,
  listLayoutsQuerySchema,
  listPublicTagsQuerySchema,
  layoutIdParamsSchema,
  revisionParamsSchema,
  publishLayoutSchema,
  listRevisionsQuerySchema,
  restoreLayoutSchema,
};
