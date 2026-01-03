import { ClaudeMemIntegration } from './integration/index.js';
export default async function plugin(input) {
    console.log('[CLAUDE_MEM_OPENCODE] Plugin loaded');
    const integration = new ClaudeMemIntegration();
    try {
        await integration.initialize();
        console.log('[CLAUDE_MEM_OPENCODE] ✅ Integration initialized');
    }
    catch (error) {
        console.error('[CLAUDE_MEM_OPENCODE] ❌ Initialization failed:', error);
    }
    return {
        event: async ({ event }) => {
            // Event handling done internally by EventListeners
        }
    };
}
//# sourceMappingURL=plugin.js.map