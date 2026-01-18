import { DEFAULT_CONFIG, ENV_PREFIX, CONFIG_FILE_TEMPLATE } from './config-defaults.js';
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
export class ConfigLoader {
    projectDir;
    constructor(projectDir) {
        this.projectDir = projectDir;
    }
    /**
     * Load configuration from all sources and merge
     */
    async load() {
        const errors = [];
        const warnings = [];
        const sources = ['defaults'];
        // Start with defaults
        let config = { ...DEFAULT_CONFIG };
        // Load environment variables
        try {
            const envConfig = this.loadFromEnv();
            config = { ...config, ...envConfig };
            if (Object.keys(envConfig).length > 0) {
                sources.push('environment');
            }
        }
        catch (error) {
            errors.push(`Failed to load environment variables: ${error}`);
        }
        // Load global config file
        try {
            const globalConfig = await this.loadFromFile(this.getGlobalConfigPath());
            if (globalConfig) {
                config = { ...config, ...globalConfig };
                sources.push('global-config');
            }
        }
        catch (error) {
            warnings.push(`Failed to load global config: ${error}`);
        }
        // Load project config file
        try {
            const projectConfig = await this.loadFromFile(this.getProjectConfigPath());
            if (projectConfig) {
                config = { ...config, ...projectConfig };
                sources.push('project-config');
            }
        }
        catch (error) {
            warnings.push(`Failed to load project config: ${error}`);
        }
        // Validate final config
        const validationErrors = this.validateConfig(config);
        errors.push(...validationErrors);
        return {
            config,
            errors,
            warnings,
            sources
        };
    }
    /**
     * Load configuration from environment variables
     * Prefix: OPENCODE_CLAUDE_MEM_*
     */
    loadFromEnv() {
        const envVars = {
            enabled: process.env[`${ENV_PREFIX}ENABLED`],
            workerPort: process.env[`${ENV_PREFIX}WORKER_PORT`],
            debug: process.env[`${ENV_PREFIX}DEBUG`],
            autoInjectContext: process.env[`${ENV_PREFIX}AUTO_INJECT_CONTEXT`],
            maxContextMemories: process.env[`${ENV_PREFIX}MAX_CONTEXT_MEMORIES`]
        };
        const config = {};
        if (envVars.enabled !== undefined) {
            config.enabled = envVars.enabled.toLowerCase() === 'true';
        }
        if (envVars.workerPort !== undefined) {
            const port = parseInt(envVars.workerPort, 10);
            if (!isNaN(port)) {
                config.workerPort = port;
            }
        }
        if (envVars.debug !== undefined) {
            config.debug = envVars.debug.toLowerCase() === 'true';
        }
        if (envVars.autoInjectContext !== undefined) {
            config.autoInjectContext = envVars.autoInjectContext.toLowerCase() === 'true';
        }
        if (envVars.maxContextMemories !== undefined) {
            const limit = parseInt(envVars.maxContextMemories, 10);
            if (!isNaN(limit)) {
                config.maxContextMemories = limit;
            }
        }
        return config;
    }
    /**
     * Load configuration from a JSONC file
     * Returns null if file doesn't exist or is empty
     * Uses Bun.file() which is available in Bun runtime
     */
    async loadFromFile(filePath) {
        try {
            // Read file using Bun.file()
            const file = Bun.file(filePath);
            const exists = await file.exists();
            if (!exists) {
                return null;
            }
            // Read and parse file
            const content = await file.text();
            // Remove JSONC comments (// and /* */)
            const jsonContent = this.stripComments(content);
            if (jsonContent.trim().length === 0) {
                return null;
            }
            const parsed = JSON.parse(jsonContent);
            return parsed;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw new Error(`Failed to parse ${filePath}: ${error}`);
        }
    }
    /**
     * Strip comments from JSONC content
     */
    stripComments(content) {
        // Remove single-line comments (//)
        let result = content.replace(/\/\/.*$/gm, '');
        // Remove multi-line comments (/* */)
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        return result;
    }
    /**
     * Get global config file path
     * ~/.config/opencode/claude-mem.jsonc
     */
    getGlobalConfigPath() {
        const homeDir = this.getHomeDir();
        return `${homeDir}/.config/opencode/claude-mem.jsonc`;
    }
    /**
     * Get project config file path
     * <project>/.opencode/claude-mem.jsonc
     */
    getProjectConfigPath() {
        return `${this.projectDir}/.opencode/claude-mem.jsonc`;
    }
    /**
     * Get home directory path
     * Uses environment variables
     */
    getHomeDir() {
        // Use environment variables (works in both Node.js and Bun)
        return process.env.HOME || process.env.USERPROFILE || '/';
    }
    /**
     * Validate configuration
     * Returns array of error messages (empty if valid)
     */
    validateConfig(config) {
        const errors = [];
        if (typeof config.enabled !== 'boolean') {
            errors.push('config.enabled must be a boolean');
        }
        if (typeof config.workerPort !== 'number' || config.workerPort < 1 || config.workerPort > 65535) {
            errors.push('config.workerPort must be a valid port number (1-65535)');
        }
        if (typeof config.debug !== 'boolean') {
            errors.push('config.debug must be a boolean');
        }
        if (typeof config.autoInjectContext !== 'boolean') {
            errors.push('config.autoInjectContext must be a boolean');
        }
        if (typeof config.maxContextMemories !== 'number' || config.maxContextMemories < 0) {
            errors.push('config.maxContextMemories must be a non-negative number');
        }
        return errors;
    }
    /**
     * Create default config file at specified path
     */
    async createDefaultConfig(filePath) {
        try {
            const file = Bun.file(filePath);
            await Bun.write(filePath, CONFIG_FILE_TEMPLATE);
        }
        catch (error) {
            throw new Error(`Failed to create config file: ${error}`);
        }
    }
    /**
     * Check if config file exists
     */
    async configExists(filePath) {
        try {
            const file = Bun.file(filePath);
            return await file.exists();
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=config.js.map