/**
 * Inject claude-mem memory context into OpenCode sessions
 */
import { WorkerClient } from './worker-client.js';
export declare class ContextInjector {
    private workerClient;
    private projectNameExtractor;
    constructor(workerClient: WorkerClient);
    /**
     * Inject memory context into a session
     * Called when session is created
     */
    injectContext(project: string): Promise<string>;
    /**
     * Get memory context as system prompt addition
     */
    getSystemPromptAddition(project: string): Promise<string>;
}
//# sourceMappingURL=context-injector.d.ts.map