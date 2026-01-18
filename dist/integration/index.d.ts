/**
 * Main entry point for claude-mem OpenCode integration
 * Initializes worker client, event listeners, and context injection
 */
import { WorkerClient } from './worker-client.js';
import { EventListeners } from './event-listeners.js';
import { ContextInjector } from './context-injector.js';
export declare class ClaudeMemIntegration {
    private workerClient;
    private eventListeners;
    private contextInjector;
    private projectNameExtractor;
    private logger;
    private initialized;
    private memoryAvailable;
    constructor(workerUrl?: string);
    /**
     * Initialize integration
     */
    initialize(): Promise<void>;
    /**
     * Get integration status
     */
    getStatus(): Promise<{
        initialized: boolean;
        workerReady: boolean;
        workerUrl: string;
        currentProject: string;
    }>;
    /**
     * Get project context
     */
    getProjectContext(project?: string): Promise<string | null>;
    /**
     * Search memories
     */
    searchMemory(query: string, options?: {
        limit?: number;
        type?: 'all' | 'code' | 'file' | 'web' | 'bash';
        project?: string;
    }): Promise<any>;
    /**
     * Shutdown integration
     */
    shutdown(): Promise<void>;
    /**
     * Get worker client (for advanced usage)
     */
    getWorkerClient(): WorkerClient;
    /**
     * Get event listeners (for advanced usage)
     */
    getEventListeners(): EventListeners;
    /**
     * Get context injector (for advanced usage)
     */
    getContextInjector(): ContextInjector;
    /**
     * Check if memory features are available
     */
    isMemoryAvailable(): boolean;
}
declare const defaultInstance: ClaudeMemIntegration;
export default ClaudeMemIntegration;
export { defaultInstance };
//# sourceMappingURL=index.d.ts.map