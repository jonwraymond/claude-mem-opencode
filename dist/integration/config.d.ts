import type { ConfigLoadResult } from './config-schema.js';
/**
 * Configuration loader for claude-mem-opencode plugin
 * Loads config from multiple sources in priority order:
 * 1. Default values
 * 2. Environment variables
 * 3. Global config file (~/.config/opencode/claude-mem.jsonc)
 * 4. Project config file (project/.opencode/claude-mem.jsonc)
 *
 * Uses Bun APIs instead of Node.js built-ins for compatibility
 */
export declare class ConfigLoader {
    private projectDir;
    constructor(projectDir: string);
    /**
     * Load configuration from all sources and merge
     */
    load(): Promise<ConfigLoadResult>;
    /**
     * Load configuration from environment variables
     * Prefix: OPENCODE_CLAUDE_MEM_*
     */
    private loadFromEnv;
    /**
     * Load configuration from a JSONC file
     * Returns null if file doesn't exist or is empty
     * Uses Bun.file() which is available in Bun runtime
     */
    private loadFromFile;
    /**
     * Strip comments from JSONC content
     */
    private stripComments;
    /**
     * Get global config file path
     * ~/.config/opencode/claude-mem.jsonc
     */
    private getGlobalConfigPath;
    /**
     * Get project config file path
     * <project>/.opencode/claude-mem.jsonc
     */
    private getProjectConfigPath;
    /**
     * Get home directory path
     * Uses environment variables
     */
    private getHomeDir;
    /**
     * Validate configuration
     * Returns array of error messages (empty if valid)
     */
    private validateConfig;
    /**
     * Create default config file at specified path
     */
    createDefaultConfig(filePath: string): Promise<void>;
    /**
     * Check if config file exists
     */
    configExists(filePath: string): Promise<boolean>;
}
//# sourceMappingURL=config.d.ts.map