import type { ClaudeMemConfig } from './config-schema.js';
/**
 * Default configuration values
 */
export declare const DEFAULT_CONFIG: ClaudeMemConfig;
/**
 * Template for configuration file
 * Users can copy this to create their own config
 */
export declare const CONFIG_FILE_TEMPLATE = "{\n  // claude-mem OpenCode Plugin Configuration\n  // Supports JSONC (JavaScript with Comments)\n  \n  // Enable/disable the plugin\n  \"enabled\": true,\n  \n  // Worker service port\n  \"workerPort\": 37777,\n  \n  // Debug logging\n  \"debug\": false,\n  \n  // Automatically inject context on first message\n  \"autoInjectContext\": true,\n  \n  // Maximum number of memories to inject\n  \"maxContextMemories\": 5\n}";
/**
 * Environment variable prefix for configuration
 */
export declare const ENV_PREFIX = "OPENCODE_CLAUDE_MEM_";
//# sourceMappingURL=config-defaults.d.ts.map