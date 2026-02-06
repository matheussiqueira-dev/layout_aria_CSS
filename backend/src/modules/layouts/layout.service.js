const crypto = require("node:crypto");
const {
  notFound,
  forbidden,
  conflict,
} = require("../../core/errors");
const {
  sanitizeText,
  sanitizeMultilineText,
  sanitizeTags,
} = require("../../core/sanitize");

function toTimestamp(value) {
  const date = new Date(value).getTime();
  return Number.isFinite(date) ? date : 0;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

class LayoutService {
  constructor(store, options = {}) {
    this.store = store;
    const parsedTtl = Number(options.publicCacheTtlMs);
    this.publicCacheTtlMs = Number.isFinite(parsedTtl) ? Math.max(0, parsedTtl) : 15000;
    this.publicCache = new Map();
  }

  toPublicLayout(layout) {
    return {
      id: layout.id,
      ownerId: layout.ownerId,
      name: layout.name,
      description: layout.description,
      tags: layout.tags,
      config: layout.config,
      isPublic: layout.isPublic,
      stars: layout.stars,
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt,
      version: layout.version,
    };
  }

  toPublicRevision(revision) {
    return {
      id: revision.id,
      layoutId: revision.layoutId,
      version: revision.version,
      action: revision.action,
      createdAt: revision.createdAt,
      createdBy: revision.createdBy,
      snapshot: revision.snapshot,
    };
  }

  assertCanRead(layout, actor) {
    const isOwner = actor && layout.ownerId === actor.id;
    const isAdmin = actor && actor.role === "admin";

    if (layout.isPublic || isOwner || isAdmin) {
      return;
    }

    throw forbidden("You cannot access this layout");
  }

  assertCanWrite(layout, actor) {
    const isOwner = layout.ownerId === actor.id;
    const isAdmin = actor.role === "admin";

    if (!isOwner && !isAdmin) {
      throw forbidden("You cannot change this layout");
    }
  }

  assertExpectedVersion(layout, expectedVersion) {
    if (expectedVersion === undefined) {
      return;
    }

    if (layout.version !== expectedVersion) {
      throw conflict(
        `Version mismatch. Expected ${expectedVersion}, current ${layout.version}`
      );
    }
  }

  ensureLayoutRevisions(db) {
    if (!Array.isArray(db.layoutRevisions)) {
      db.layoutRevisions = [];
    }
  }

  buildRevisionSnapshot(layout) {
    return {
      name: layout.name,
      description: layout.description,
      tags: [...layout.tags],
      config: deepClone(layout.config),
      isPublic: layout.isPublic,
    };
  }

  appendRevision(db, { layout, action, actorId, createdAt }) {
    this.ensureLayoutRevisions(db);

    const revision = {
      id: crypto.randomUUID(),
      layoutId: layout.id,
      version: layout.version,
      action,
      createdAt,
      createdBy: actorId,
      snapshot: this.buildRevisionSnapshot(layout),
    };

    db.layoutRevisions.push(revision);
    return revision;
  }

  buildCacheKey(prefix, payload) {
    return `${prefix}:${JSON.stringify(payload)}`;
  }

  getCachedValue(key) {
    if (this.publicCacheTtlMs === 0) {
      return null;
    }

    const entry = this.publicCache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.publicCache.delete(key);
      return null;
    }

    return deepClone(entry.value);
  }

  setCachedValue(key, value) {
    if (this.publicCacheTtlMs === 0) {
      return;
    }

    this.publicCache.set(key, {
      value: deepClone(value),
      expiresAt: Date.now() + this.publicCacheTtlMs,
    });
  }

  invalidatePublicCache() {
    this.publicCache.clear();
  }

  normalizeInput(input) {
    return {
      name: input.name !== undefined ? sanitizeText(input.name, 120) : undefined,
      description:
        input.description !== undefined
          ? sanitizeMultilineText(input.description, 800)
          : undefined,
      tags: input.tags !== undefined ? sanitizeTags(input.tags) : undefined,
      config: input.config,
      isPublic: input.isPublic,
      expectedVersion:
        input.expectedVersion !== undefined ? Number(input.expectedVersion) : undefined,
    };
  }

  async listPublic(query) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const sort = query.sort === "popular" ? "popular" : "recent";
    const search = sanitizeText(query.search || "", 120).toLowerCase();
    const tagFilter = sanitizeText(query.tag || "", 24).toLowerCase();
    const cacheKey = this.buildCacheKey("public-list", {
      page,
      limit,
      sort,
      search,
      tag: tagFilter,
    });
    const cached = this.getCachedValue(cacheKey);

    if (cached) {
      return cached;
    }

    const snapshot = await this.store.read();

    let items = snapshot.layouts.filter((layout) => layout.isPublic);

    if (search) {
      items = items.filter((layout) => {
        return (
          layout.name.toLowerCase().includes(search) ||
          layout.description.toLowerCase().includes(search)
        );
      });
    }

    if (tagFilter) {
      items = items.filter((layout) => layout.tags.includes(tagFilter));
    }

    if (sort === "popular") {
      items.sort((a, b) => {
        if (b.stars !== a.stars) {
          return b.stars - a.stars;
        }

        return toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt);
      });
    } else {
      items.sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt));
    }

    const total = items.length;
    const offset = (page - 1) * limit;
    const paged = items
      .slice(offset, offset + limit)
      .map((layout) => this.toPublicLayout(layout));

    const result = {
      items: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };

    this.setCachedValue(cacheKey, result);
    return result;
  }

  async listPublicTags(query) {
    const limit = query.limit || 20;
    const cacheKey = this.buildCacheKey("public-tags", { limit });
    const cached = this.getCachedValue(cacheKey);

    if (cached) {
      return cached;
    }

    const snapshot = await this.store.read();
    const counters = new Map();

    for (const layout of snapshot.layouts) {
      if (!layout.isPublic || !Array.isArray(layout.tags)) {
        continue;
      }

      for (const rawTag of layout.tags) {
        const tag = sanitizeText(rawTag, 24).toLowerCase();
        if (!tag) {
          continue;
        }

        counters.set(tag, (counters.get(tag) || 0) + 1);
      }
    }

    const items = Array.from(counters.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return a.tag.localeCompare(b.tag);
      })
      .slice(0, limit);

    const result = {
      items,
      totalUniqueTags: counters.size,
    };

    this.setCachedValue(cacheKey, result);
    return result;
  }

  async listMine(actor, query) {
    const snapshot = await this.store.read();
    const page = query.page || 1;
    const limit = query.limit || 20;

    const items = snapshot.layouts
      .filter((layout) => layout.ownerId === actor.id)
      .sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt));

    const total = items.length;
    const offset = (page - 1) * limit;

    return {
      items: items.slice(offset, offset + limit).map((layout) => this.toPublicLayout(layout)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getById(id, actor) {
    const snapshot = await this.store.read();
    const layout = snapshot.layouts.find((entry) => entry.id === id);

    if (!layout) {
      throw notFound("Layout not found");
    }

    this.assertCanRead(layout, actor);
    return this.toPublicLayout(layout);
  }

  async listRevisions(id, actor, query) {
    const snapshot = await this.store.read();
    const layout = snapshot.layouts.find((entry) => entry.id === id);

    if (!layout) {
      throw notFound("Layout not found");
    }

    this.assertCanRead(layout, actor);

    const revisions = (snapshot.layoutRevisions || [])
      .filter((entry) => entry.layoutId === id)
      .sort((a, b) => {
        if (b.version !== a.version) {
          return b.version - a.version;
        }

        return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
      });

    const total = revisions.length;
    const offset = (query.page - 1) * query.limit;

    return {
      items: revisions
        .slice(offset, offset + query.limit)
        .map((revision) => this.toPublicRevision(revision)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async getRevisionById(id, revisionId, actor) {
    const snapshot = await this.store.read();
    const layout = snapshot.layouts.find((entry) => entry.id === id);

    if (!layout) {
      throw notFound("Layout not found");
    }

    this.assertCanRead(layout, actor);

    const revision = (snapshot.layoutRevisions || []).find(
      (entry) => entry.layoutId === id && entry.id === revisionId
    );

    if (!revision) {
      throw notFound("Revision not found");
    }

    return this.toPublicRevision(revision);
  }

  async create(input, actor, context = {}) {
    const now = new Date().toISOString();
    const safeInput = this.normalizeInput(input);

    return this.store.mutate((db) => {
      const layout = {
        id: crypto.randomUUID(),
        ownerId: actor.id,
        name: safeInput.name,
        description: safeInput.description || "",
        tags: safeInput.tags || [],
        config: deepClone(safeInput.config),
        isPublic: Boolean(safeInput.isPublic),
        stars: 0,
        starredBy: [],
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      db.layouts.push(layout);
      this.appendRevision(db, {
        layout,
        action: "layout.create",
        actorId: actor.id,
        createdAt: now,
      });

      db.auditLogs.push({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorRole: actor.role,
        action: "layout.create",
        resourceType: "layout",
        resourceId: layout.id,
        metadata: {
          ip: context.ip || null,
          userAgent: context.userAgent || null,
          version: layout.version,
        },
        timestamp: now,
      });

      this.invalidatePublicCache();
      return this.toPublicLayout(layout);
    });
  }

  async update(id, input, actor, context = {}) {
    const now = new Date().toISOString();
    const safeInput = this.normalizeInput(input);

    return this.store.mutate((db) => {
      const layout = db.layouts.find((entry) => entry.id === id);
      if (!layout) {
        throw notFound("Layout not found");
      }

      this.assertCanWrite(layout, actor);
      this.assertExpectedVersion(layout, safeInput.expectedVersion);

      if (safeInput.name !== undefined) {
        layout.name = safeInput.name;
      }

      if (safeInput.description !== undefined) {
        layout.description = safeInput.description;
      }

      if (safeInput.tags !== undefined) {
        layout.tags = [...safeInput.tags];
      }

      if (safeInput.config !== undefined) {
        layout.config = deepClone(safeInput.config);
      }

      if (safeInput.isPublic !== undefined) {
        layout.isPublic = Boolean(safeInput.isPublic);
      }

      layout.version += 1;
      layout.updatedAt = now;

      this.appendRevision(db, {
        layout,
        action: "layout.update",
        actorId: actor.id,
        createdAt: now,
      });

      db.auditLogs.push({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorRole: actor.role,
        action: "layout.update",
        resourceType: "layout",
        resourceId: layout.id,
        metadata: {
          ip: context.ip || null,
          userAgent: context.userAgent || null,
          changedFields: Object.keys(input).filter((entry) => entry !== "expectedVersion"),
          version: layout.version,
        },
        timestamp: now,
      });

      this.invalidatePublicCache();
      return this.toPublicLayout(layout);
    });
  }

  async remove(id, actor, context = {}) {
    const now = new Date().toISOString();

    return this.store.mutate((db) => {
      const index = db.layouts.findIndex((entry) => entry.id === id);
      if (index < 0) {
        throw notFound("Layout not found");
      }

      const layout = db.layouts[index];
      this.assertCanWrite(layout, actor);
      db.layouts.splice(index, 1);

      this.ensureLayoutRevisions(db);
      const previousCount = db.layoutRevisions.length;
      db.layoutRevisions = db.layoutRevisions.filter((entry) => entry.layoutId !== id);
      const removedRevisions = previousCount - db.layoutRevisions.length;

      db.auditLogs.push({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorRole: actor.role,
        action: "layout.delete",
        resourceType: "layout",
        resourceId: id,
        metadata: {
          ip: context.ip || null,
          userAgent: context.userAgent || null,
          removedRevisions,
        },
        timestamp: now,
      });

      this.invalidatePublicCache();
      return { deleted: true, id };
    });
  }

  async setPublishStatus(id, isPublic, expectedVersion, actor, context = {}) {
    const now = new Date().toISOString();

    return this.store.mutate((db) => {
      const layout = db.layouts.find((entry) => entry.id === id);
      if (!layout) {
        throw notFound("Layout not found");
      }

      this.assertCanWrite(layout, actor);
      this.assertExpectedVersion(layout, expectedVersion);

      const nextVisibility = Boolean(isPublic);
      const visibilityChanged = layout.isPublic !== nextVisibility;

      layout.isPublic = nextVisibility;

      if (visibilityChanged) {
        layout.version += 1;
        layout.updatedAt = now;

        this.appendRevision(db, {
          layout,
          action: nextVisibility ? "layout.publish" : "layout.unpublish",
          actorId: actor.id,
          createdAt: now,
        });
      }

      db.auditLogs.push({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorRole: actor.role,
        action: nextVisibility ? "layout.publish" : "layout.unpublish",
        resourceType: "layout",
        resourceId: layout.id,
        metadata: {
          ip: context.ip || null,
          userAgent: context.userAgent || null,
          changed: visibilityChanged,
          version: layout.version,
        },
        timestamp: now,
      });

      this.invalidatePublicCache();
      return this.toPublicLayout(layout);
    });
  }

  async toggleStar(id, actor, context = {}) {
    const now = new Date().toISOString();

    return this.store.mutate((db) => {
      const layout = db.layouts.find((entry) => entry.id === id);
      if (!layout) {
        throw notFound("Layout not found");
      }

      this.assertCanRead(layout, actor);

      const hasStar = layout.starredBy.includes(actor.id);
      if (hasStar) {
        layout.starredBy = layout.starredBy.filter((entry) => entry !== actor.id);
      } else {
        layout.starredBy.push(actor.id);
      }

      layout.stars = layout.starredBy.length;
      layout.updatedAt = now;

      db.auditLogs.push({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorRole: actor.role,
        action: hasStar ? "layout.unstar" : "layout.star",
        resourceType: "layout",
        resourceId: layout.id,
        metadata: {
          ip: context.ip || null,
          userAgent: context.userAgent || null,
          stars: layout.stars,
        },
        timestamp: now,
      });

      this.invalidatePublicCache();
      return {
        starred: !hasStar,
        stars: layout.stars,
      };
    });
  }

  async clone(id, actor, context = {}) {
    const now = new Date().toISOString();

    return this.store.mutate((db) => {
      const source = db.layouts.find((entry) => entry.id === id);
      if (!source) {
        throw notFound("Layout not found");
      }

      this.assertCanRead(source, actor);

      const cloned = {
        id: crypto.randomUUID(),
        ownerId: actor.id,
        name: `${source.name} (clone)`,
        description: source.description,
        tags: [...source.tags],
        config: deepClone(source.config),
        isPublic: false,
        stars: 0,
        starredBy: [],
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      db.layouts.push(cloned);
      this.appendRevision(db, {
        layout: cloned,
        action: "layout.clone",
        actorId: actor.id,
        createdAt: now,
      });

      db.auditLogs.push({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorRole: actor.role,
        action: "layout.clone",
        resourceType: "layout",
        resourceId: cloned.id,
        metadata: {
          sourceLayoutId: source.id,
          ip: context.ip || null,
          userAgent: context.userAgent || null,
          version: cloned.version,
        },
        timestamp: now,
      });

      this.invalidatePublicCache();
      return this.toPublicLayout(cloned);
    });
  }

  async restoreRevision(id, revisionId, expectedVersion, actor, context = {}) {
    const now = new Date().toISOString();

    return this.store.mutate((db) => {
      const layout = db.layouts.find((entry) => entry.id === id);
      if (!layout) {
        throw notFound("Layout not found");
      }

      this.assertCanWrite(layout, actor);
      this.assertExpectedVersion(layout, expectedVersion);
      this.ensureLayoutRevisions(db);

      const revision = db.layoutRevisions.find(
        (entry) => entry.layoutId === id && entry.id === revisionId
      );

      if (!revision) {
        throw notFound("Revision not found");
      }

      layout.name = revision.snapshot.name;
      layout.description = revision.snapshot.description;
      layout.tags = [...revision.snapshot.tags];
      layout.config = deepClone(revision.snapshot.config);
      layout.isPublic = Boolean(revision.snapshot.isPublic);
      layout.version += 1;
      layout.updatedAt = now;

      this.appendRevision(db, {
        layout,
        action: "layout.restore",
        actorId: actor.id,
        createdAt: now,
      });

      db.auditLogs.push({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorRole: actor.role,
        action: "layout.restore",
        resourceType: "layout",
        resourceId: layout.id,
        metadata: {
          restoredFromRevisionId: revision.id,
          restoredFromVersion: revision.version,
          ip: context.ip || null,
          userAgent: context.userAgent || null,
          version: layout.version,
        },
        timestamp: now,
      });

      this.invalidatePublicCache();
      return this.toPublicLayout(layout);
    });
  }
}

module.exports = {
  LayoutService,
};
