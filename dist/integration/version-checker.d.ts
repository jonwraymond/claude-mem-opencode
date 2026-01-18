/**
 * Runtime claude-mem version compatibility checker
 */
export interface WorkerHealthResponse {
    status: 'ok' | 'error';
    version: string;
    apiVersion: string;
}
export interface CompatibilityResult {
    isCompatible: boolean;
    isTested: boolean;
    workerVersion: string;
    apiVersion: string;
    recommendation: string;
    testedVersions: string[];
}
export interface CompatibilityMatrix {
    version: string;
    status: 'compatible' | 'incompatible' | 'unknown';
    date: string;
    notes?: string;
}
export declare class VersionChecker {
    private workerUrl;
    private readonly COMPATIBILITY_FILE;
    constructor(workerUrl?: string);
    /**
     * Check worker health and version
     */
    checkWorkerHealth(): Promise<WorkerHealthResponse>;
    /**
     * Parse COMPATIBILITY.md to get tested versions
     */
    getTestedVersions(): Promise<CompatibilityMatrix[]>;
    /**
     * Check if a specific version has been tested
     */
    isVersionTested(version: string, testedVersions: CompatibilityMatrix[]): boolean;
    /**
     * Check API version compatibility
     */
    isApiVersionCompatible(apiVersion: string): boolean;
    /**
     * Full compatibility check
     */
    checkCompatibility(): Promise<CompatibilityResult>;
    /**
     * Log compatibility warning if needed
     */
    logCompatibilityWarning(): Promise<void>;
}
//# sourceMappingURL=version-checker.d.ts.map