/**
 * HTTP client for claude-mem worker API
 * Handles all communication with worker service on localhost:37777
 */
export interface InitSessionRequest {
    contentSessionId: string;
    project: string;
    prompt: string;
}
export interface InitSessionResponse {
    sessionDbId: number;
    promptNumber: number;
    skipped: boolean;
    reason?: string;
}
export interface ObservationRequest {
    sessionDbId: number;
    contentSessionId: string;
    promptNumber: number;
    toolName: string;
    toolInput: any;
    toolOutput: string;
    cwd: string;
    timestamp: number;
}
export declare class WorkerClient {
    private baseUrl;
    private timeout;
    constructor(portOrUrl?: number | string);
    /**
     * Get worker port
     */
    getPort(): number;
    /**
     * Get worker URL
     */
    getWorkerUrl(): string;
    /**
     * Check if worker is running (returns full health data)
     */
    checkHealth(): Promise<any>;
    /**
     * Check if worker is running (boolean)
     */
    healthCheck(): Promise<boolean>;
    /**
     * Wait for worker to be ready
     */
    waitForReady(timeoutMs?: number): Promise<boolean>;
    /**
     * Check if worker is ready to accept requests
     */
    readinessCheck(): Promise<boolean>;
    /**
     * Initialize a new claude-mem session
     */
    initSession(request: InitSessionRequest): Promise<InitSessionResponse>;
    /**
     * Add an observation (tool usage) to a session
     */
    addObservation(request: ObservationRequest): Promise<void>;
    /**
     * Complete a session (triggers summarization)
     */
    completeSession(sessionDbId: number): Promise<void>;
    /**
     * Get memory context for a project
     */
    getProjectContext(project: string): Promise<string>;
    /**
     * Search memory (basic search, returns observation IDs)
     */
    search(query: string, options?: {
        limit?: number;
        type?: string;
        project?: string;
    }): Promise<any>;
    /**
     * Search memories (alias for search with object parameter)
     */
    searchMemories(params: {
        query: string;
        type?: string;
        limit?: number;
    }): Promise<any>;
    /**
     * Get full observations by IDs
     */
    getObservations(ids: number[]): Promise<any>;
    /**
     * Get timeline context around an observation
     */
    getTimeline(sessionDbId: number, observationId: number, window?: number): Promise<any>;
}
//# sourceMappingURL=worker-client.d.ts.map