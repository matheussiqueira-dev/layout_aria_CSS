const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const assert = require("node:assert/strict");
const test = require("node:test");
const request = require("supertest");

process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = "test-secret-key-with-at-least-32-characters";

const { createApp } = require("../src/app");

test("backend API flow: auth, revisions, concurrency and metrics", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "layout-api-test-"));
  const dataFilePath = path.join(tempDir, "db.json");

  const app = await createApp({
    dataFilePath,
    openApiFilePath: path.resolve(process.cwd(), "openapi.yaml"),
  });

  const unique = Date.now();
  const registerPayload = {
    name: "Test User",
    email: `tester-${unique}@example.com`,
    password: "Str0ng@Pass123",
  };

  const registerRes = await request(app).post("/api/v1/auth/register").send(registerPayload);
  assert.equal(registerRes.statusCode, 201);
  assert.ok(registerRes.body.accessToken);
  assert.ok(registerRes.body.refreshToken);

  const firstRefreshToken = registerRes.body.refreshToken;

  const refreshRes = await request(app)
    .post("/api/v1/auth/refresh")
    .send({ refreshToken: firstRefreshToken });

  assert.equal(refreshRes.statusCode, 200);
  assert.ok(refreshRes.body.accessToken);
  assert.ok(refreshRes.body.refreshToken);
  assert.notEqual(refreshRes.body.refreshToken, firstRefreshToken);

  const staleRefreshRes = await request(app)
    .post("/api/v1/auth/refresh")
    .send({ refreshToken: firstRefreshToken });

  assert.equal(staleRefreshRes.statusCode, 401);

  const accessToken = refreshRes.body.accessToken;
  const activeRefreshToken = refreshRes.body.refreshToken;

  const meRes = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(meRes.statusCode, 200);
  assert.equal(meRes.body.user.email, registerPayload.email);

  const secondLoginRes = await request(app).post("/api/v1/auth/login").send({
    email: registerPayload.email,
    password: registerPayload.password,
  });

  assert.equal(secondLoginRes.statusCode, 200);
  assert.ok(secondLoginRes.body.refreshToken);
  const secondRefreshToken = secondLoginRes.body.refreshToken;

  const sessionsRes = await request(app)
    .get("/api/v1/auth/sessions")
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(sessionsRes.statusCode, 200);
  assert.ok(Array.isArray(sessionsRes.body.items));
  assert.ok(sessionsRes.body.items.length >= 2);
  assert.equal(typeof sessionsRes.body.summary.active, "number");

  const anotherSession = sessionsRes.body.items.find(
    (entry) => entry.isCurrent === false && !entry.revokedAt
  );
  assert.ok(anotherSession?.id);

  const revokeSessionRes = await request(app)
    .delete(`/api/v1/auth/sessions/${anotherSession.id}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(revokeSessionRes.statusCode, 200);
  assert.equal(revokeSessionRes.body.revoked, true);
  assert.equal(revokeSessionRes.body.session.id, anotherSession.id);

  const refreshRevokedSessionRes = await request(app)
    .post("/api/v1/auth/refresh")
    .send({ refreshToken: secondRefreshToken });

  assert.equal(refreshRevokedSessionRes.statusCode, 401);

  const createLayoutRes = await request(app)
    .post("/api/v1/layouts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Meu layout",
      description: "Layout de teste para API",
      tags: ["test", "api"],
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
    });

  assert.equal(createLayoutRes.statusCode, 201);
  assert.ok(createLayoutRes.body.layout.id);
  assert.equal(createLayoutRes.body.layout.version, 1);

  const layoutId = createLayoutRes.body.layout.id;

  const updateLayoutRes = await request(app)
    .patch(`/api/v1/layouts/${layoutId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Meu layout atualizado",
      expectedVersion: 1,
    });

  assert.equal(updateLayoutRes.statusCode, 200);
  assert.equal(updateLayoutRes.body.layout.version, 2);

  const staleUpdateRes = await request(app)
    .patch(`/api/v1/layouts/${layoutId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      description: "Tentativa stale",
      expectedVersion: 1,
    });

  assert.equal(staleUpdateRes.statusCode, 409);

  const revisionsRes = await request(app)
    .get(`/api/v1/layouts/${layoutId}/revisions`)
    .set("Authorization", `Bearer ${accessToken}`)
    .query({ page: 1, limit: 20 });

  assert.equal(revisionsRes.statusCode, 200);
  assert.ok(Array.isArray(revisionsRes.body.items));
  assert.ok(revisionsRes.body.items.length >= 2);

  const oldestRevision = revisionsRes.body.items[revisionsRes.body.items.length - 1];
  assert.ok(oldestRevision.id);

  const revisionDetailRes = await request(app)
    .get(`/api/v1/layouts/${layoutId}/revisions/${oldestRevision.id}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(revisionDetailRes.statusCode, 200);
  assert.equal(revisionDetailRes.body.revision.id, oldestRevision.id);

  const restoreRes = await request(app)
    .post(`/api/v1/layouts/${layoutId}/restore`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      revisionId: oldestRevision.id,
      expectedVersion: 2,
    });

  assert.equal(restoreRes.statusCode, 200);
  assert.equal(restoreRes.body.layout.version, 3);

  const publicListRes = await request(app).get("/api/v1/layouts/public");
  assert.equal(publicListRes.statusCode, 200);
  assert.ok(publicListRes.body.items.some((entry) => entry.id === layoutId));

  const publicTagsRes = await request(app).get("/api/v1/layouts/public/tags").query({ limit: 10 });
  assert.equal(publicTagsRes.statusCode, 200);
  assert.ok(Array.isArray(publicTagsRes.body.items));
  assert.ok(publicTagsRes.body.items.some((entry) => entry.tag === "test"));
  assert.equal(typeof publicTagsRes.body.totalUniqueTags, "number");

  const metricsUnauthorizedRes = await request(app).get("/api/v1/metrics");
  assert.equal(metricsUnauthorizedRes.statusCode, 401);

  const adminLoginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "admin@layoutaria.dev", password: "Admin@123456" });

  assert.equal(adminLoginRes.statusCode, 200);
  const adminToken = adminLoginRes.body.accessToken;
  assert.ok(adminLoginRes.body.refreshToken);

  const statsRes = await request(app)
    .get("/api/v1/admin/stats")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(statsRes.statusCode, 200);
  assert.equal(typeof statsRes.body.stats.layouts, "number");
  assert.equal(typeof statsRes.body.stats.sessions, "number");
  assert.equal(typeof statsRes.body.stats.activeSessions, "number");
  assert.ok(statsRes.body.stats.layoutRevisions >= 3);

  const metricsRes = await request(app)
    .get("/api/v1/metrics")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(metricsRes.statusCode, 200);
  assert.ok(metricsRes.body.counters.layoutRevisions >= 3);
  assert.equal(typeof metricsRes.body.counters.sessions, "number");
  assert.equal(typeof metricsRes.body.counters.activeSessions, "number");

  const logoutRes = await request(app)
    .post("/api/v1/auth/logout")
    .send({ refreshToken: activeRefreshToken });

  assert.equal(logoutRes.statusCode, 200);
  assert.equal(logoutRes.body.revoked, true);

  const refreshAfterLogoutRes = await request(app)
    .post("/api/v1/auth/refresh")
    .send({ refreshToken: activeRefreshToken });

  assert.equal(refreshAfterLogoutRes.statusCode, 401);

  const adminLogoutAllRes = await request(app)
    .post("/api/v1/auth/logout-all")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(adminLogoutAllRes.statusCode, 200);
  assert.equal(typeof adminLogoutAllRes.body.revokedSessions, "number");

  await fs.rm(tempDir, { recursive: true, force: true });
});
