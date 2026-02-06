const crypto = require("node:crypto");
const { hashPassword, verifyPassword } = require("../../core/password");
const { signAccessToken } = require("../../core/token");
const { conflict, unauthorized, notFound } = require("../../core/errors");
const { sanitizeText } = require("../../core/sanitize");

const DAY_MS = 24 * 60 * 60 * 1000;

function toTimestamp(value) {
  const date = new Date(value).getTime();
  return Number.isFinite(date) ? date : 0;
}

function hashRefreshToken(refreshToken) {
  return crypto.createHash("sha256").update(refreshToken).digest("hex");
}

class AuthService {
  constructor(store, options = {}) {
    this.store = store;
    const parsedTtlDays = Number(options.refreshTokenTtlDays);
    const parsedMaxSessions = Number(options.maxActiveSessions);
    this.refreshTokenTtlDays = Number.isFinite(parsedTtlDays)
      ? Math.max(1, parsedTtlDays)
      : 14;
    this.maxActiveSessions = Number.isFinite(parsedMaxSessions)
      ? Math.max(1, parsedMaxSessions)
      : 5;
  }

  static toPublicUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toPublicSession(session, currentSessionId) {
    return {
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      revokeReason: session.revokeReason,
      lastUsedAt: session.lastUsedAt,
      lastIp: session.lastIp,
      lastUserAgent: session.lastUserAgent,
      isCurrent: session.id === currentSessionId,
    };
  }

  ensureSessions(db) {
    if (!Array.isArray(db.sessions)) {
      db.sessions = [];
    }
  }

  isSessionActive(session, nowMs) {
    if (!session || session.revokedAt) {
      return false;
    }

    return toTimestamp(session.expiresAt) > nowMs;
  }

  cleanupStaleSessions(db, nowMs) {
    this.ensureSessions(db);
    const retentionMs = 30 * DAY_MS;

    db.sessions = db.sessions.filter((session) => {
      const revokedAtMs = toTimestamp(session.revokedAt);
      const expiresAtMs = toTimestamp(session.expiresAt);
      const isOldRevoked = revokedAtMs > 0 && revokedAtMs <= nowMs - retentionMs;
      const isOldExpired = expiresAtMs > 0 && expiresAtMs <= nowMs - retentionMs;
      return !(isOldRevoked || isOldExpired);
    });
  }

  revokeOldestActiveSessions(db, userId, nowIso, reason) {
    const nowMs = toTimestamp(nowIso);
    const active = db.sessions
      .filter((session) => session.userId === userId && this.isSessionActive(session, nowMs))
      .sort((a, b) => {
        const aLast = toTimestamp(a.lastUsedAt || a.createdAt);
        const bLast = toTimestamp(b.lastUsedAt || b.createdAt);
        return aLast - bLast;
      });

    const overflow = Math.max(0, active.length - this.maxActiveSessions + 1);
    for (let index = 0; index < overflow; index += 1) {
      const session = active[index];
      session.revokedAt = nowIso;
      session.revokeReason = reason;
      session.updatedAt = nowIso;
    }
  }

  createSession(db, userId, context, nowIso, metadata = {}) {
    const rawToken = crypto.randomBytes(48).toString("base64url");
    const expiresAtIso = new Date(toTimestamp(nowIso) + this.refreshTokenTtlDays * DAY_MS).toISOString();
    const session = {
      id: crypto.randomUUID(),
      userId,
      tokenHash: hashRefreshToken(rawToken),
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt: expiresAtIso,
      revokedAt: null,
      revokeReason: null,
      replacedBy: null,
      lastUsedAt: nowIso,
      lastIp: context.ip || null,
      lastUserAgent: context.userAgent || null,
      metadata,
    };

    db.sessions.push(session);
    return {
      session,
      rawToken,
      expiresAtIso,
    };
  }

  buildAuthResponse(user, refreshToken, refreshTokenExpiresAt, sessionId) {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId || undefined,
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
      tokenType: "Bearer",
      user: AuthService.toPublicUser(user),
    };
  }

  pushAuditLog(db, user, action, nowIso, context = {}, metadata = {}) {
    db.auditLogs.push({
      id: crypto.randomUUID(),
      actorId: user.id,
      actorRole: user.role,
      action,
      resourceType: "user",
      resourceId: user.id,
      metadata: {
        ip: context.ip || null,
        userAgent: context.userAgent || null,
        ...metadata,
      },
      timestamp: nowIso,
    });
  }

  issueSessionResponse(db, user, action, context = {}, metadata = {}) {
    const nowIso = new Date().toISOString();
    const nowMs = toTimestamp(nowIso);

    this.cleanupStaleSessions(db, nowMs);
    this.revokeOldestActiveSessions(db, user.id, nowIso, "session_limit");

    const { session, rawToken, expiresAtIso } = this.createSession(db, user.id, context, nowIso, metadata);

    this.pushAuditLog(db, user, action, nowIso, context, {
      sessionId: session.id,
      refreshTokenExpiresAt: session.expiresAt,
    });

    return this.buildAuthResponse(user, rawToken, expiresAtIso, session.id);
  }

  async register(input, context = {}) {
    const normalizedEmail = sanitizeText(input.email, 180).toLowerCase();
    const safeName = sanitizeText(input.name, 80);
    const now = new Date().toISOString();

    return this.store.mutate(async (db) => {
      const existing = db.users.find((user) => user.email === normalizedEmail);
      if (existing) {
        throw conflict("Email already registered");
      }

      const user = {
        id: crypto.randomUUID(),
        name: safeName,
        email: normalizedEmail,
        passwordHash: await hashPassword(input.password),
        role: "user",
        createdAt: now,
        updatedAt: now,
      };

      db.users.push(user);

      return this.issueSessionResponse(db, user, "auth.register", context, {
        method: "register",
      });
    });
  }

  async login(input, context = {}) {
    const normalizedEmail = sanitizeText(input.email, 180).toLowerCase();

    return this.store.mutate(async (db) => {
      const user = db.users.find((entry) => entry.email === normalizedEmail);

      if (!user) {
        throw unauthorized("Invalid credentials");
      }

      const isValidPassword = await verifyPassword(input.password, user.passwordHash);
      if (!isValidPassword) {
        throw unauthorized("Invalid credentials");
      }

      return this.issueSessionResponse(db, user, "auth.login", context, {
        method: "password",
      });
    });
  }

  async refreshToken(refreshToken, context = {}) {
    const tokenValue = sanitizeText(refreshToken, 512);
    const tokenHash = hashRefreshToken(tokenValue);
    const nowIso = new Date().toISOString();
    const nowMs = toTimestamp(nowIso);

    return this.store.mutate((db) => {
      this.cleanupStaleSessions(db, nowMs);
      this.ensureSessions(db);

      const session = db.sessions.find((entry) => entry.tokenHash === tokenHash);
      if (!this.isSessionActive(session, nowMs)) {
        throw unauthorized("Invalid or expired refresh token");
      }

      const user = db.users.find((entry) => entry.id === session.userId);
      if (!user) {
        throw unauthorized("Invalid or expired refresh token");
      }

      session.revokedAt = nowIso;
      session.revokeReason = "rotated";
      session.lastUsedAt = nowIso;
      session.lastIp = context.ip || session.lastIp || null;
      session.lastUserAgent = context.userAgent || session.lastUserAgent || null;
      session.updatedAt = nowIso;

      this.revokeOldestActiveSessions(db, user.id, nowIso, "session_limit");
      const { session: nextSession, rawToken, expiresAtIso } = this.createSession(
        db,
        user.id,
        context,
        nowIso,
        { previousSessionId: session.id }
      );

      session.replacedBy = nextSession.id;

      this.pushAuditLog(db, user, "auth.refresh", nowIso, context, {
        previousSessionId: session.id,
        nextSessionId: nextSession.id,
        refreshTokenExpiresAt: nextSession.expiresAt,
      });

      return this.buildAuthResponse(user, rawToken, expiresAtIso, nextSession.id);
    });
  }

  async logout(refreshToken, context = {}) {
    const tokenValue = sanitizeText(refreshToken, 512);
    const tokenHash = hashRefreshToken(tokenValue);
    const nowIso = new Date().toISOString();
    const nowMs = toTimestamp(nowIso);

    return this.store.mutate((db) => {
      this.cleanupStaleSessions(db, nowMs);
      this.ensureSessions(db);

      const session = db.sessions.find((entry) => entry.tokenHash === tokenHash);
      if (!this.isSessionActive(session, nowMs)) {
        return { revoked: false };
      }

      session.revokedAt = nowIso;
      session.revokeReason = "logout";
      session.lastUsedAt = nowIso;
      session.lastIp = context.ip || session.lastIp || null;
      session.lastUserAgent = context.userAgent || session.lastUserAgent || null;
      session.updatedAt = nowIso;

      const user = db.users.find((entry) => entry.id === session.userId);
      if (user) {
        this.pushAuditLog(db, user, "auth.logout", nowIso, context, {
          sessionId: session.id,
        });
      }

      return { revoked: true };
    });
  }

  async logoutAll(userId, context = {}) {
    const nowIso = new Date().toISOString();
    const nowMs = toTimestamp(nowIso);

    return this.store.mutate((db) => {
      this.cleanupStaleSessions(db, nowMs);
      this.ensureSessions(db);

      const user = db.users.find((entry) => entry.id === userId);
      if (!user) {
        throw notFound("User not found");
      }

      let revokedSessions = 0;
      for (const session of db.sessions) {
        if (session.userId !== user.id || !this.isSessionActive(session, nowMs)) {
          continue;
        }

        session.revokedAt = nowIso;
        session.revokeReason = "logout_all";
        session.lastUsedAt = nowIso;
        session.lastIp = context.ip || session.lastIp || null;
        session.lastUserAgent = context.userAgent || session.lastUserAgent || null;
        session.updatedAt = nowIso;
        revokedSessions += 1;
      }

      this.pushAuditLog(db, user, "auth.logout_all", nowIso, context, {
        revokedSessions,
      });

      return { revokedSessions };
    });
  }

  async listSessions(userId, currentSessionId = null) {
    const snapshot = await this.store.read();
    const nowMs = Date.now();

    const user = snapshot.users.find((entry) => entry.id === userId);
    if (!user) {
      throw notFound("User not found");
    }

    const sessions = (snapshot.sessions || [])
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => toTimestamp(b.lastUsedAt || b.createdAt) - toTimestamp(a.lastUsedAt || a.createdAt))
      .slice(0, 25);

    const activeCount = sessions.filter((session) => this.isSessionActive(session, nowMs)).length;

    return {
      items: sessions.map((session) => AuthService.toPublicSession(session, currentSessionId)),
      summary: {
        total: sessions.length,
        active: activeCount,
      },
    };
  }

  async revokeSession(userId, sessionId, currentSessionId = null, context = {}) {
    const nowIso = new Date().toISOString();
    const nowMs = toTimestamp(nowIso);

    return this.store.mutate((db) => {
      this.cleanupStaleSessions(db, nowMs);
      this.ensureSessions(db);

      const user = db.users.find((entry) => entry.id === userId);
      if (!user) {
        throw notFound("User not found");
      }

      const session = db.sessions.find((entry) => entry.id === sessionId && entry.userId === userId);
      if (!session) {
        throw notFound("Session not found");
      }

      if (!this.isSessionActive(session, nowMs)) {
        return {
          revoked: false,
          session: AuthService.toPublicSession(session, currentSessionId),
        };
      }

      session.revokedAt = nowIso;
      session.revokeReason = "manual_revoke";
      session.lastUsedAt = nowIso;
      session.lastIp = context.ip || session.lastIp || null;
      session.lastUserAgent = context.userAgent || session.lastUserAgent || null;
      session.updatedAt = nowIso;

      this.pushAuditLog(db, user, "auth.session.revoke", nowIso, context, {
        sessionId: session.id,
      });

      return {
        revoked: true,
        session: AuthService.toPublicSession(session, currentSessionId),
      };
    });
  }

  async me(userId) {
    const snapshot = await this.store.read();
    const user = snapshot.users.find((entry) => entry.id === userId);

    if (!user) {
      throw notFound("User not found");
    }

    return AuthService.toPublicUser(user);
  }
}

module.exports = {
  AuthService,
};
