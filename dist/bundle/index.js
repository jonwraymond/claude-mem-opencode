// src/integration/worker-client.ts
class WorkerClient {
  baseUrl;
  timeout = 30000;
  constructor(portOrUrl = 37777) {
    if (typeof portOrUrl === "string") {
      this.baseUrl = portOrUrl;
    } else {
      this.baseUrl = `http://127.0.0.1:${portOrUrl}`;
    }
  }
  getPort() {
    const match = this.baseUrl.match(/:(\d+)$/);
    return match ? parseInt(match[1]) : 37777;
  }
  getWorkerUrl() {
    return this.baseUrl;
  }
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.log("[WORKER_CLIENT] Health check failed:", error);
      return { status: "error", version: "unknown" };
    }
  }
  async healthCheck() {
    const result = await this.checkHealth();
    return result.status === "ok" || result.status === undefined;
  }
  async waitForReady(timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ready = await this.readinessCheck();
      if (ready)
        return true;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
  }
  async readinessCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/readiness`);
      return response.ok;
    } catch {
      return false;
    }
  }
  async initSession(request) {
    const response = await fetch(`${this.baseUrl}/api/sessions/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!response.ok) {
      throw new Error(`Session init failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
  async addObservation(request) {
    const response = await fetch(`${this.baseUrl}/api/sessions/observations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!response.ok) {
      throw new Error(`Observation add failed: ${response.status} ${response.statusText}`);
    }
  }
  async completeSession(sessionDbId) {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionDbId}/complete`, {
      method: "POST",
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!response.ok) {
      throw new Error(`Session complete failed: ${response.status} ${response.statusText}`);
    }
  }
  async getProjectContext(project) {
    const url = `${this.baseUrl}/api/context/inject?project=${encodeURIComponent(project)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!response.ok) {
      throw new Error(`Context fetch failed: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }
  async search(query, options) {
    const params = new URLSearchParams({
      q: query,
      limit: String(options?.limit ?? 10)
    });
    if (options?.type)
      params.append("type", options.type);
    if (options?.project)
      params.append("project", options.project);
    const response = await fetch(`${this.baseUrl}/api/search?${params}`, {
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
  async searchMemories(params) {
    return this.search(params.query, {
      type: params.type,
      limit: params.limit
    });
  }
  async getObservations(ids) {
    const response = await fetch(`${this.baseUrl}/api/observations/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!response.ok) {
      throw new Error(`Get observations failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
  async getTimeline(sessionDbId, observationId, window = 5) {
    const response = await fetch(`${this.baseUrl}/api/timeline?session=${sessionDbId}&observation=${observationId}&window=${window}`, {
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!response.ok) {
      throw new Error(`Timeline fetch failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
}
// src/integration/utils/logger.ts
var LogLevel;
((LogLevel2) => {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
})(LogLevel ||= {});

class Logger {
  context;
  constructor(context) {
    this.context = context;
  }
  debug(message, ...args) {
    console.log(`[${this.context}] [DEBUG] ${message}`, ...args);
  }
  info(message, ...args) {
    console.log(`[${this.context}] [INFO] ${message}`, ...args);
  }
  warn(message, ...args) {
    console.warn(`[${this.context}] [WARN] ${message}`, ...args);
  }
  error(message, ...args) {
    console.error(`[${this.context}] [ERROR] ${message}`, ...args);
  }
}
// src/integration/utils/project-name.ts
import path from "path";

class ProjectNameExtractor {
  extract(directory) {
    const baseName = path.basename(directory);
    if (baseName.startsWith(".")) {
      const parent = path.dirname(directory);
      return path.basename(parent);
    }
    return baseName;
  }
  getCurrentProject() {
    return this.extract(process.cwd());
  }
}
// src/integration/utils/privacy.ts
class PrivacyTagStripper {
  PRIVATE_TAG_REGEX = /<private>[\s\S]*?<\/private>/gi;
  CONTEXT_TAG_REGEX = /<claude-mem-context>[\s\S]*?<\/claude-mem-context>/gi;
  stripFromText(text) {
    if (!text)
      return text;
    return text.replace(this.PRIVATE_TAG_REGEX, "[private content removed]").replace(this.CONTEXT_TAG_REGEX, "[system context removed]");
  }
  stripFromJson(obj) {
    if (typeof obj === "string") {
      return this.stripFromText(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.stripFromJson(item));
    }
    if (obj !== null && typeof obj === "object") {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.stripFromJson(value);
      }
      return result;
    }
    return obj;
  }
  isFullyPrivate(text) {
    const stripped = this.stripFromText(text);
    return stripped.trim().length === 0;
  }
  hasPrivacyTags(text) {
    return this.PRIVATE_TAG_REGEX.test(text) || this.CONTEXT_TAG_REGEX.test(text);
  }
  countPrivacyTags(text) {
    const privateMatches = text.match(this.PRIVATE_TAG_REGEX);
    const contextMatches = text.match(this.CONTEXT_TAG_REGEX);
    return {
      private: privateMatches ? privateMatches.length : 0,
      context: contextMatches ? contextMatches.length : 0
    };
  }
}
export {
  WorkerClient,
  ProjectNameExtractor,
  PrivacyTagStripper,
  Logger,
  LogLevel
};
