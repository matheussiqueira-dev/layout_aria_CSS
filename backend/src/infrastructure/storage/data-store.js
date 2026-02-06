const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_DB = {
  users: [],
  sessions: [],
  layouts: [],
  layoutRevisions: [],
  auditLogs: [],
  meta: {
    version: 1,
    createdAt: null,
    updatedAt: null,
  },
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

class JsonDataStore {
  constructor(filePath, logger) {
    this.filePath = filePath;
    this.logger = logger;
    this.state = null;
    this.writeQueue = Promise.resolve();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true });

    try {
      await fs.access(this.filePath);
    } catch {
      const seeded = deepClone(DEFAULT_DB);
      seeded.meta.createdAt = new Date().toISOString();
      seeded.meta.updatedAt = seeded.meta.createdAt;
      await fs.writeFile(this.filePath, JSON.stringify(seeded, null, 2), "utf8");
    }

    const content = await fs.readFile(this.filePath, "utf8");

    try {
      this.state = JSON.parse(content);
    } catch (error) {
      const fallbackPath = `${this.filePath}.corrupted.${Date.now()}`;
      await fs.copyFile(this.filePath, fallbackPath);
      this.logger?.error({ err: error, fallbackPath }, "Database file corrupted, fallback created");
      this.state = deepClone(DEFAULT_DB);
      this.state.meta.createdAt = new Date().toISOString();
      this.state.meta.updatedAt = this.state.meta.createdAt;
      await this.persist();
    }

    if (!this.state.meta) {
      this.state.meta = {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (!Array.isArray(this.state.users)) {
      this.state.users = [];
    }

    if (!Array.isArray(this.state.sessions)) {
      this.state.sessions = [];
    }

    if (!Array.isArray(this.state.layouts)) {
      this.state.layouts = [];
    }

    if (!Array.isArray(this.state.layoutRevisions)) {
      this.state.layoutRevisions = [];
    }

    if (!Array.isArray(this.state.auditLogs)) {
      this.state.auditLogs = [];
    }

    this.initialized = true;
  }

  async read() {
    await this.init();
    return deepClone(this.state);
  }

  async mutate(mutator) {
    const execute = async () => {
      await this.init();
      const result = await mutator(this.state);
      this.state.meta.updatedAt = new Date().toISOString();
      await this.persist();
      return result === undefined ? deepClone(this.state) : deepClone(result);
    };

    this.writeQueue = this.writeQueue.then(execute, execute);
    return this.writeQueue;
  }

  async persist() {
    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(this.state, null, 2), "utf8");
    await fs.rename(tempPath, this.filePath);
  }
}

module.exports = {
  JsonDataStore,
};
