class AdminService {
  constructor(store) {
    this.store = store;
  }

  async listUsers({ page, limit }) {
    const snapshot = await this.store.read();

    const users = [...snapshot.users].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const offset = (page - 1) * limit;
    const items = users.slice(offset, offset + limit).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total: users.length,
        totalPages: Math.max(1, Math.ceil(users.length / limit)),
      },
    };
  }

  async listAuditLogs({ page, limit, action, actorId }) {
    const snapshot = await this.store.read();

    let logs = [...snapshot.auditLogs];

    if (action) {
      logs = logs.filter((entry) => entry.action === action);
    }

    if (actorId) {
      logs = logs.filter((entry) => entry.actorId === actorId);
    }

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const offset = (page - 1) * limit;
    return {
      items: logs.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        total: logs.length,
        totalPages: Math.max(1, Math.ceil(logs.length / limit)),
      },
    };
  }

  async getSystemStats() {
    const snapshot = await this.store.read();
    const nowMs = Date.now();

    const publicLayouts = snapshot.layouts.filter((layout) => layout.isPublic).length;
    const privateLayouts = snapshot.layouts.length - publicLayouts;
    const sessions = Array.isArray(snapshot.sessions) ? snapshot.sessions : [];
    const activeSessions = sessions.filter((session) => {
      if (session.revokedAt) {
        return false;
      }

      const expiresAtMs = new Date(session.expiresAt).getTime();
      return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
    }).length;

    return {
      users: snapshot.users.length,
      sessions: sessions.length,
      activeSessions,
      layouts: snapshot.layouts.length,
      publicLayouts,
      privateLayouts,
      layoutRevisions: (snapshot.layoutRevisions || []).length,
      auditEvents: snapshot.auditLogs.length,
      updatedAt: snapshot.meta?.updatedAt || null,
    };
  }
}

module.exports = {
  AdminService,
};
