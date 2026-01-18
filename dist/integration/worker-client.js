/**
 * HTTP client for claude-mem worker API
 * Handles all communication with worker service on localhost:37777
 */
export class WorkerClient {
    baseUrl;
    timeout = 30000;
    constructor(portOrUrl = 37777) {
        if (typeof portOrUrl === 'string') {
            this.baseUrl = portOrUrl;
        }
        else {
            this.baseUrl = `http://127.0.0.1:${portOrUrl}`;
        }
    }
    /**
     * Get worker port
     */
    getPort() {
        const match = this.baseUrl.match(/:(\d+)$/);
        return match ? parseInt(match[1]) : 37777;
    }
    /**
     * Get worker URL
     */
    getWorkerUrl() {
        return this.baseUrl;
    }
    /**
     * Check if worker is running (returns full health data)
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`, {
                signal: AbortSignal.timeout(5000)
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.log('[WORKER_CLIENT] Health check failed:', error);
            return { status: 'error', version: 'unknown' };
        }
    }
    /**
     * Check if worker is running (boolean)
     */
    async healthCheck() {
        const result = await this.checkHealth();
        return result.status === 'ok' || result.status === undefined;
    }
    /**
     * Wait for worker to be ready
     */
    async waitForReady(timeoutMs = 30000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const ready = await this.readinessCheck();
            if (ready)
                return true;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return false;
    }
    /**
     * Check if worker is ready to accept requests
     */
    async readinessCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/api/readiness`);
            return response.ok;
        }
        catch {
            return false;
        }
    }
    /**
     * Initialize a new claude-mem session
     */
    async initSession(request) {
        const response = await fetch(`${this.baseUrl}/api/sessions/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
            signal: AbortSignal.timeout(this.timeout)
        });
        if (!response.ok) {
            throw new Error(`Session init failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Add an observation (tool usage) to a session
     */
    async addObservation(request) {
        const response = await fetch(`${this.baseUrl}/api/sessions/observations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
            signal: AbortSignal.timeout(this.timeout)
        });
        if (!response.ok) {
            throw new Error(`Observation add failed: ${response.status} ${response.statusText}`);
        }
    }
    /**
     * Complete a session (triggers summarization)
     */
    async completeSession(sessionDbId) {
        const response = await fetch(`${this.baseUrl}/sessions/${sessionDbId}/complete`, {
            method: 'POST',
            signal: AbortSignal.timeout(this.timeout)
        });
        if (!response.ok) {
            throw new Error(`Session complete failed: ${response.status} ${response.statusText}`);
        }
    }
    /**
     * Get memory context for a project
     */
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
    /**
     * Search memory (basic search, returns observation IDs)
     */
    async search(query, options) {
        const params = new URLSearchParams({
            q: query,
            limit: String(options?.limit ?? 10)
        });
        if (options?.type)
            params.append('type', options.type);
        if (options?.project)
            params.append('project', options.project);
        const response = await fetch(`${this.baseUrl}/api/search?${params}`, {
            signal: AbortSignal.timeout(this.timeout)
        });
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Search memories (alias for search with object parameter)
     */
    async searchMemories(params) {
        return this.search(params.query, {
            type: params.type,
            limit: params.limit
        });
    }
    /**
     * Get full observations by IDs
     */
    async getObservations(ids) {
        const response = await fetch(`${this.baseUrl}/api/observations/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
            signal: AbortSignal.timeout(this.timeout)
        });
        if (!response.ok) {
            throw new Error(`Get observations failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Get timeline context around an observation
     */
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
//# sourceMappingURL=worker-client.js.map