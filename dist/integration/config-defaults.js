/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
    enabled: true,
    workerPort: 37777,
    debug: false,
    autoInjectContext: true,
    maxContextMemories: 5
};
/**
 * Template for configuration file
 * Users can copy this to create their own config
 */
export const CONFIG_FILE_TEMPLATE = `{
  // claude-mem OpenCode Plugin Configuration
  // Supports JSONC (JavaScript with Comments)
  
  // Enable/disable the plugin
  "enabled": true,
  
  // Worker service port
  "workerPort": 37777,
  
  // Debug logging
  "debug": false,
  
  // Automatically inject context on first message
  "autoInjectContext": true,
  
  // Maximum number of memories to inject
  "maxContextMemories": 5
}`;
/**
 * Environment variable prefix for configuration
 */
export const ENV_PREFIX = 'OPENCODE_CLAUDE_MEM_';
//# sourceMappingURL=config-defaults.js.map