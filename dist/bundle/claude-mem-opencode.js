import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __require = /* @__PURE__ */ createRequire(import.meta.url);

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

// src/integration/session-mapper.ts
class SessionMapper {
  mapping = new Map;
  mapOpenCodeToClaudeMem(openCodeSessionId, claudeMemSessionId) {
    this.mapping.set(openCodeSessionId, claudeMemSessionId);
    console.log(`[SESSION_MAPPER] Mapped ${openCodeSessionId} → ${claudeMemSessionId}`);
  }
  getClaudeMemSessionId(openCodeSessionId) {
    return this.mapping.get(openCodeSessionId);
  }
  getOpenCodeSessionId(claudeMemSessionId) {
    for (const [openCodeId, claudeMemId] of this.mapping.entries()) {
      if (claudeMemId === claudeMemSessionId) {
        return openCodeId;
      }
    }
    return;
  }
  unmapSession(openCodeSessionId) {
    this.mapping.delete(openCodeSessionId);
    console.log(`[SESSION_MAPPER] Unmapped ${openCodeSessionId}`);
  }
  getAllMappings() {
    return new Map(this.mapping);
  }
  hasSession(openCodeSessionId) {
    return this.mapping.has(openCodeSessionId);
  }
  size() {
    return this.mapping.size;
  }
  clear() {
    this.mapping.clear();
    console.log("[SESSION_MAPPER] Cleared all mappings");
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

// src/integration/event-listeners.ts
var Bus = null;
var Session = null;
var MessageV2 = null;
try {
  const busModule = await import("@/bus");
  Bus = busModule.Bus;
  const sessionModule = await import("@/session");
  Session = sessionModule.Session;
  MessageV2 = sessionModule.MessageV2;
} catch (error) {
  console.log("[EVENT_LISTENERS] OpenCode APIs not available - running in standalone mode");
}

class EventListeners {
  workerClient;
  sessionMapper;
  projectNameExtractor;
  privacyStripper;
  promptNumberTracker = new Map;
  constructor(workerClient) {
    this.workerClient = workerClient;
    this.sessionMapper = new SessionMapper;
    this.projectNameExtractor = new ProjectNameExtractor;
    this.privacyStripper = new PrivacyTagStripper;
  }
  async initialize() {
    if (!Bus || !Session || !MessageV2) {
      console.log("[EVENT_LISTENERS] OpenCode APIs not available - event listeners will be initialized via manual calls");
      return;
    }
    console.log("[EVENT_LISTENERS] Initializing OpenCode event listeners...");
    Bus.subscribe(Session.Event.Created, this.handleSessionCreated.bind(this));
    Bus.subscribe(MessageV2.Event.PartUpdated, this.handleMessagePartUpdated.bind(this));
    Bus.subscribe(Session.Event.Updated, this.handleSessionUpdated.bind(this));
    console.log("[EVENT_LISTENERS] Subscribed to OpenCode Bus events");
  }
  async handleSessionCreated(event) {
    const { info } = event.properties;
    const project = this.projectNameExtractor.extract(info.directory);
    const openCodeSessionId = info.id;
    const title = info.title || "New session";
    console.log(`[EVENT_LISTENERS] Session created: ${openCodeSessionId}`);
    try {
      const response = await this.workerClient.initSession({
        contentSessionId: openCodeSessionId,
        project,
        prompt: title
      });
      if (response.skipped) {
        console.log(`[EVENT_LISTENERS] Session marked as private: ${openCodeSessionId}`);
        console.log(`[EVENT_LISTENERS] Reason: ${response.reason}`);
        return;
      }
      this.sessionMapper.mapOpenCodeToClaudeMem(openCodeSessionId, response.sessionDbId);
      this.promptNumberTracker.set(openCodeSessionId, response.promptNumber);
      console.log(`[EVENT_LISTENERS] Mapped ${openCodeSessionId} → ${response.sessionDbId}`);
      console.log(`[EVENT_LISTENERS] Project: ${project}, Prompt #${response.promptNumber}`);
    } catch (error) {
      console.error(`[EVENT_LISTENERS] Failed to initialize session ${openCodeSessionId}:`, error);
    }
  }
  async handleMessagePartUpdated(event) {
    const { part } = event.properties;
    if (part.type !== "tool_call") {
      return;
    }
    const toolName = part.name;
    const toolArgs = part.args;
    const toolResult = part.result || "";
    const sessionId = part.sessionID;
    const cwd = part.cwd || process.cwd();
    const claudeMemSessionId = this.sessionMapper.getClaudeMemSessionId(sessionId);
    if (!claudeMemSessionId) {
      console.log(`[EVENT_LISTENERS] No claude-mem session for: ${sessionId}`);
      return;
    }
    const promptNumber = this.getPromptNumber(sessionId);
    console.log(`[EVENT_LISTENERS] Tool usage: ${sessionId} - ${toolName}`);
    try {
      const strippedArgs = this.privacyStripper.stripFromJson(toolArgs);
      const strippedResult = this.privacyStripper.stripFromText(toolResult);
      await this.workerClient.addObservation({
        sessionDbId: claudeMemSessionId,
        promptNumber,
        toolName,
        toolInput: strippedArgs,
        toolOutput: strippedResult,
        cwd,
        timestamp: Date.now()
      });
      console.log(`[EVENT_LISTENERS] Added observation: ${claudeMemSessionId} - ${toolName}`);
    } catch (error) {
      console.error(`[EVENT_LISTENERS] Failed to add observation:`, error);
    }
  }
  async handleSessionUpdated(event) {
    const { info } = event.properties;
    if (!info.time.archived) {
      return;
    }
    const openCodeSessionId = info.id;
    console.log(`[EVENT_LISTENERS] Session archived: ${openCodeSessionId}`);
    const claudeMemSessionId = this.sessionMapper.getClaudeMemSessionId(openCodeSessionId);
    if (!claudeMemSessionId) {
      console.log(`[EVENT_LISTENERS] No claude-mem session for: ${openCodeSessionId}`);
      return;
    }
    try {
      await this.workerClient.completeSession(claudeMemSessionId);
      console.log(`[EVENT_LISTENERS] Completed session: ${claudeMemSessionId}`);
      this.sessionMapper.unmapSession(openCodeSessionId);
      this.promptNumberTracker.delete(openCodeSessionId);
    } catch (error) {
      console.error(`[EVENT_LISTENERS] Failed to complete session:`, error);
    }
  }
  getPromptNumber(sessionId) {
    return this.promptNumberTracker.get(sessionId) ?? 1;
  }
  incrementPromptNumber(sessionId) {
    const current = this.promptNumberTracker.get(sessionId) ?? 1;
    this.promptNumberTracker.set(sessionId, current + 1);
  }
}

// src/integration/context-injector.ts
class ContextInjector {
  workerClient;
  projectNameExtractor;
  constructor(workerClient) {
    this.workerClient = workerClient;
    this.projectNameExtractor = new ProjectNameExtractor;
  }
  async injectContext(project) {
    try {
      const context = await this.workerClient.getProjectContext(project);
      if (!context || !context.trim()) {
        console.log(`[CONTEXT_INJECTOR] No memory context available for project: ${project}`);
        return "";
      }
      console.log(`[CONTEXT_INJECTOR] Injected memory context for project: ${project} (${context.length} chars)`);
      return context;
    } catch (error) {
      console.warn(`[CONTEXT_INJECTOR] Failed to inject memory context for project: ${project}`, error);
      return "";
    }
  }
  async getSystemPromptAddition(project) {
    const context = await this.injectContext(project);
    if (!context)
      return "";
    return `
## Relevant Context from Past Sessions

${context}

---
`;
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

// src/integration/index.ts
class ClaudeMemIntegration {
  workerClient;
  eventListeners;
  contextInjector;
  projectNameExtractor;
  logger;
  initialized = false;
  memoryAvailable = false;
  constructor(workerUrl = "http://localhost:37777") {
    this.workerClient = new WorkerClient(workerUrl.includes("localhost") ? parseInt(workerUrl.split(":")[1] || "37777") : 37777);
    this.eventListeners = new EventListeners(this.workerClient);
    this.contextInjector = new ContextInjector(this.workerClient);
    this.projectNameExtractor = new ProjectNameExtractor;
    this.logger = new Logger("CLAUDE_MEM");
  }
  async initialize() {
    if (this.initialized) {
      console.log("[CLAUDE_MEM] Integration already initialized");
      return;
    }
    try {
      console.log("[CLAUDE_MEM] Initializing claude-mem integration...");
      console.log(`[CLAUDE_MEM] Worker port: ${this.workerClient.getPort() || "37777"}`);
      const ready = await this.workerClient.waitForReady(30000);
      if (!ready) {
        throw new Error("Worker service not ready after 30s. Is worker running?");
      }
      console.log("[CLAUDE_MEM] Worker service is ready");
      await this.eventListeners.initialize();
      this.initialized = true;
      this.memoryAvailable = true;
      console.log("[CLAUDE_MEM] Integration initialized successfully");
      console.log("[CLAUDE_MEM] Project:", this.projectNameExtractor.getCurrentProject());
    } catch (error) {
      console.error("[CLAUDE_MEM] Initialization failed:", error);
      console.warn("[CLAUDE_MEM] Continuing anyway, but expect potential issues");
      this.memoryAvailable = false;
    }
  }
  async getStatus() {
    const workerReady = this.memoryAvailable && await this.workerClient.healthCheck();
    return {
      initialized: this.initialized,
      workerReady,
      currentProject: this.projectNameExtractor.getCurrentProject(),
      workerUrl: `http://localhost:${this.workerClient.getPort() || "37777"}`
    };
  }
  async getProjectContext(project) {
    if (!this.memoryAvailable) {
      this.logger.warn("Memory features are not available");
      return null;
    }
    const projectToUse = project || this.projectNameExtractor.getCurrentProject();
    return this.contextInjector.injectContext(projectToUse);
  }
  async searchMemory(query, options) {
    if (!this.memoryAvailable) {
      this.logger.warn("Memory features are not available");
      throw new Error("Memory features not available");
    }
    return this.workerClient.search(query, options);
  }
  async shutdown() {
    this.logger.info("Shutting down integration");
    this.initialized = false;
    this.memoryAvailable = false;
  }
  getWorkerClient() {
    return this.workerClient;
  }
  getEventListeners() {
    return this.eventListeners;
  }
  getContextInjector() {
    return this.contextInjector;
  }
  isMemoryAvailable() {
    return this.memoryAvailable;
  }
}
var defaultInstance = new ClaudeMemIntegration;
var integration_default = ClaudeMemIntegration;
export {
  defaultInstance,
  integration_default as default,
  WorkerClient,
  SessionMapper,
  ProjectNameExtractor,
  PrivacyTagStripper,
  Logger,
  LogLevel,
  EventListeners,
  ContextInjector,
  ClaudeMemIntegration
};
