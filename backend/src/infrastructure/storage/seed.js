const crypto = require("node:crypto");
const { hashPassword } = require("../../core/password");

async function seedInitialData(store, logger, options = {}) {
  const adminEmail = (options.adminEmail || "admin@layoutaria.dev").toLowerCase();
  const adminPassword = options.adminPassword || "Admin@123456";

  await store.mutate(async (db) => {
    if (!Array.isArray(db.layoutRevisions)) {
      db.layoutRevisions = [];
    }

    if (!Array.isArray(db.sessions)) {
      db.sessions = [];
    }

    const hasUsers = db.users.length > 0;

    if (!hasUsers) {
      const now = new Date().toISOString();
      const adminUser = {
        id: crypto.randomUUID(),
        name: "System Admin",
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        role: "admin",
        createdAt: now,
        updatedAt: now,
      };

      db.users.push(adminUser);
      db.auditLogs.push({
        id: crypto.randomUUID(),
        actorId: adminUser.id,
        actorRole: "system",
        action: "seed.admin.created",
        resourceType: "user",
        resourceId: adminUser.id,
        timestamp: now,
      });

      logger?.warn(
        {
          email: adminEmail,
          defaultPassword: adminPassword,
        },
        "Default admin user created. Change credentials immediately in production"
      );
    }

    const hasPublicLayout = db.layouts.some((layout) => layout.isPublic);

    if (!hasPublicLayout && db.users[0]) {
      const now = new Date().toISOString();
      const layout = {
        id: crypto.randomUUID(),
        ownerId: db.users[0].id,
        name: "Layout inicial compartilhado",
        description: "Preset base para demonstrar API backend de layouts.",
        tags: ["demo", "flexbox"],
        config: {
          direction: "row",
          justifyContent: "center",
          alignItems: "center",
          alignContent: "stretch",
          wrap: "nowrap",
          gapPx: 20,
          minHeightVh: 72,
          itemSizePx: 152,
          itemCount: 3,
          showIndex: true,
          showAxes: true,
        },
        isPublic: true,
        stars: 0,
        starredBy: [],
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      db.layouts.push(layout);
      db.layoutRevisions.push({
        id: crypto.randomUUID(),
        layoutId: layout.id,
        version: layout.version,
        action: "layout.seed",
        createdAt: now,
        createdBy: db.users[0].id,
        snapshot: {
          name: layout.name,
          description: layout.description,
          tags: [...layout.tags],
          config: JSON.parse(JSON.stringify(layout.config)),
          isPublic: layout.isPublic,
        },
      });
    }
  });
}

module.exports = {
  seedInitialData,
};
