/**
 * Configuration interfaces for claude-mem-opencode plugin
 */
export interface ClaudeMemConfig {
    enabled: boolean;
    workerPort: number;
    debug: boolean;
    autoInjectContext: boolean;
    maxContextMemories: number;
}
export interface ConfigLoadResult {
    config: ClaudeMemConfig;
    errors: string[];
    warnings: string[];
    sources: string[];
}
export interface ConfigFile {
    enabled?: boolean;
    workerPort?: number;
    debug?: boolean;
    autoInjectContext?: boolean;
    maxContextMemories?: number;
}
//# sourceMappingURL=config-schema.d.ts.map