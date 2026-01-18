/**
 * Main entry point for claude-mem OpenCode integration
 * Initializes worker client, event listeners, and context injection
 */
import { WorkerClient } from './worker-client.js';
import { EventListeners } from './event-listeners.js';
import { ContextInjector } from './context-injector.js';
import { ProjectNameExtractor } from './utils/project-name.js';
import { Logger } from './utils/logger.js';
export class ClaudeMemIntegration {
    workerClient;
    eventListeners;
    contextInjector;
    projectNameExtractor;
    logger;
    initialized = false;
    memoryAvailable = false;
    constructor(workerUrl = 'http://localhost:37777') {
        this.workerClient = new WorkerClient(workerUrl.includes('localhost') ?
            parseInt(workerUrl.split(':')[1] || '37777') :
            37777);
        this.eventListeners = new EventListeners(this.workerClient);
        this.contextInjector = new ContextInjector(this.workerClient);
        this.projectNameExtractor = new ProjectNameExtractor();
        this.logger = new Logger('CLAUDE_MEM');
    }
    /**
     * Initialize integration
     */
    async initialize() {
        if (this.initialized) {
            console.log('[CLAUDE_MEM] Integration already initialized');
            return;
        }
        try {
            console.log('[CLAUDE_MEM] Initializing claude-mem integration...');
            console.log(`[CLAUDE_MEM] Worker port: ${this.workerClient.getPort() || '37777'}`);
            const ready = await this.workerClient.waitForReady(30000);
            if (!ready) {
                throw new Error('Worker service not ready after 30s. Is worker running?');
            }
            console.log('[CLAUDE_MEM] Worker service is ready');
            await this.eventListeners.initialize();
            this.initialized = true;
            this.memoryAvailable = true;
            console.log('[CLAUDE_MEM] Integration initialized successfully');
            console.log('[CLAUDE_MEM] Project:', this.projectNameExtractor.getCurrentProject());
        }
        catch (error) {
            console.error('[CLAUDE_MEM] Initialization failed:', error);
            console.warn('[CLAUDE_MEM] Continuing anyway, but expect potential issues');
            this.memoryAvailable = false;
        }
    }
    /**
     * Get integration status
     */
    async getStatus() {
        const workerReady = this.memoryAvailable &&
            (await this.workerClient.healthCheck());
        return {
            initialized: this.initialized,
            workerReady,
            currentProject: this.projectNameExtractor.getCurrentProject(),
            workerUrl: `http://localhost:${this.workerClient.getPort() || '37777'}`
        };
    }
    /**
     * Get project context
     */
    async getProjectContext(project) {
        if (!this.memoryAvailable) {
            this.logger.warn('Memory features are not available');
            return null;
        }
        const projectToUse = project || this.projectNameExtractor.getCurrentProject();
        return this.contextInjector.injectContext(projectToUse);
    }
    /**
     * Search memories
     */
    async searchMemory(query, options) {
        if (!this.memoryAvailable) {
            this.logger.warn('Memory features are not available');
            throw new Error('Memory features not available');
        }
        return this.workerClient.search(query, options);
    }
    /**
     * Shutdown integration
     */
    async shutdown() {
        this.logger.info('Shutting down integration');
        this.initialized = false;
        this.memoryAvailable = false;
    }
    /**
     * Get worker client (for advanced usage)
     */
    getWorkerClient() {
        return this.workerClient;
    }
    /**
     * Get event listeners (for advanced usage)
     */
    getEventListeners() {
        return this.eventListeners;
    }
    /**
     * Get context injector (for advanced usage)
     */
    getContextInjector() {
        return this.contextInjector;
    }
    /**
     * Check if memory features are available
     */
    isMemoryAvailable() {
        return this.memoryAvailable;
    }
}
// Create singleton instance for convenience
const defaultInstance = new ClaudeMemIntegration();
// Export the class as default, and the singleton as a named export
export default ClaudeMemIntegration;
export { defaultInstance };
//# sourceMappingURL=index.js.map