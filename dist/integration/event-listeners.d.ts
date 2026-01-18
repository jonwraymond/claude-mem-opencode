/**
 * Subscribe to OpenCode Bus events and bridge to claude-mem
 * Adapted to use real OpenCode APIs (with fallback for testing)
 */
import { WorkerClient } from './worker-client.js';
export declare class EventListeners {
    private workerClient;
    private sessionMapper;
    private projectNameExtractor;
    private privacyStripper;
    private promptNumberTracker;
    constructor(workerClient: WorkerClient);
    /**
     * Subscribe to all relevant OpenCode events using real Bus API
     */
    initialize(): Promise<void>;
    /**
     * Handle session creation - initialize claude-mem session
     * Uses real Session.Info from OpenCode
     */
    private handleSessionCreated;
    /**
     * Handle message part updates - capture tool usage
     * Uses real MessageV2.Part from OpenCode
     */
    private handleMessagePartUpdated;
    /**
     * Handle session updates - check for completion
     * Uses real Session.Info from OpenCode
     */
    private handleSessionUpdated;
    /**
     * Get current prompt number for a session
     */
    getPromptNumber(sessionId: string): number;
    /**
     * Increment prompt number for a session
     */
    incrementPromptNumber(sessionId: string): void;
}
//# sourceMappingURL=event-listeners.d.ts.map