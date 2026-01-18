import { tool } from "@opencode-ai/plugin";
import { WorkerClient } from "./integration/worker-client.js";
import { ProjectNameExtractor } from "./integration/utils/project-name.js";
import { PrivacyTagStripper } from "./integration/utils/privacy.js";
import { ConfigLoader } from "./integration/config.js";
// Module-level debug flag (set from config on init)
let _debug = false;

/**
  * OpenCode plugin for claude-mem persistent memory
 * Provides automatic context capture and injection across sessions
 */
export const ClaudeMemPlugin = async (ctx) => {
    const { directory, client, project } = ctx;
    // Load configuration from multiple sources
    const configLoader = new ConfigLoader(directory);
    const { config, errors, warnings, sources } = await configLoader.load();
    _debug = config.debug || false;
    // Log configuration warnings and errors
    if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`[CLAUDE_MEM] ⚠️  ${warning}`));
    }
    if (errors.length > 0) {
        errors.forEach(error => console.error(`[CLAUDE_MEM] ❌ ${error}`));
        // If config has errors, fail hard
        throw new Error(`Configuration errors: ${errors.join(', ')}`);
    }
    // Log configuration source
    _debug && console.log(`[CLAUDE_MEM] Configuration loaded from: ${sources.join(' → ')}`);
    const projectNameExtractor = new ProjectNameExtractor();
    const projectName = projectNameExtractor.extract(directory) || 'unknown';
    const privacyStripper = new PrivacyTagStripper();
    // Session state management
    const sessionStates = new Map();
    _debug && console.log('[CLAUDE_MEM] Initializing plugin...');
    _debug && console.log(`[CLAUDE_MEM] Project: ${projectName}`);
    _debug && console.log(`[CLAUDE_MEM] Worker port: ${config.workerPort}`);
    _debug && console.log(`[CLAUDE_MEM] Debug: ${config.debug}`);
    // Initialize worker client
    const workerClient = new WorkerClient(config.workerPort);
    // Fail hard: Worker must be available
    try {
        _debug && console.log('[CLAUDE_MEM] Checking worker availability...');
        const workerReady = await workerClient.healthCheck();
        if (!workerReady) {
            throw new Error('claude-mem worker is not running. Start it with: claude-mem worker start');
        }
        _debug && console.log('[CLAUDE_MEM] ✅ Worker connected - plugin active');
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[CLAUDE_MEM] ❌ Worker initialization failed:', errorMsg);
        // Fail hard: Show toast notification and disable plugin
        try {
            await client.tui.showToast({
                body: {
                    title: "claude-mem Plugin Disabled",
                    message: errorMsg,
                    variant: "error",
                    duration: 10000
                }
            });
        }
        catch (toastError) {
            console.error('[CLAUDE_MEM] Failed to show toast:', toastError);
        }
        // Return empty hooks object to disable plugin
        return {};
    }
    return {
        /**
         * Event hook - Handle session lifecycle
         * Handles session creation and completion
         */
        event: async (input) => {
            if (!config.enabled)
                return;
            try {
                switch (input.event.type) {
                    case 'session.created':
                        await handleSessionCreated(input.event, sessionStates, workerClient, projectName, privacyStripper);
                        break;
                    case 'session.updated':
                        await handleSessionUpdated(input.event, sessionStates, workerClient);
                        break;
                }
            }
            catch (error) {
                console.error('[CLAUDE_MEM] Event handler error:', error);
            }
        },
        /**
         * Chat message hook - Inject context on first message
         * Similar to supermemory's context injection pattern
         */
        'chat.message': async (input, output) => {
            if (!config.enabled || !config.autoInjectContext)
                return;
            const state = sessionStates.get(input.sessionID);
            // Skip if no state, already injected, or private session
            if (!state || state.contextInjected || state.isPrivate) {
                return;
            }
            try {
                _debug && console.log(`[CLAUDE_MEM] Injecting context for session ${input.sessionID}`);
                // Fetch relevant memories for this project
                const response = await workerClient.search('', {
                    limit: config.maxContextMemories,
                    project: projectName
                });
                if (!response.success || !response.results || response.results.length === 0) {
                    _debug && console.log('[CLAUDE_MEM] No relevant memories found');
                    state.contextInjected = true;
                    return;
                }
                // Format context for injection
                const contextText = formatContextForPrompt(response.results, projectName);
                // Create synthetic part for context injection
                const contextPart = {
                    id: `claude-mem-context-${Date.now()}`,
                    sessionID: input.sessionID,
                    messageID: output.message.id,
                    type: "text",
                    text: contextText,
                    synthetic: true,
                };
                // Unshift to inject at beginning (before user message)
                output.parts.unshift(contextPart);
                state.contextInjected = true;
                _debug && console.log(`[CLAUDE_MEM] ✅ Context injected (${contextText.length} chars)`);
            }
            catch (error) {
                console.error('[CLAUDE_MEM] Context injection failed:', error);
                // Mark as injected to avoid retries
                state.contextInjected = true;
            }
        },
        /**
         * Tool execution hook - Capture tool usage
         * Runs after tool execution completes
         */
        'tool.execute.after': async (input, output) => {
            if (!config.enabled)
                return;
            const state = sessionStates.get(input.sessionID);
            // Skip if no claude-mem session, private session, or tool execution failed
            if (!state || !state.claudeMemSessionId || state.isPrivate) {
                return;
            }
            try {
                _debug && console.log(`[CLAUDE_MEM] Capturing tool: ${input.tool}`);
                // Strip private tags from tool input and output
                const cleanedInput = privacyStripper.stripFromJson(input.tool);
                const cleanedOutput = privacyStripper.stripFromText(output.output);
                // Add observation to claude-mem
                await workerClient.addObservation({
                    sessionDbId: state.claudeMemSessionId,
                    contentSessionId: state.sessionId,
                    promptNumber: state.promptNumber,
                    toolName: input.tool,
                    toolInput: cleanedInput,
                    toolOutput: cleanedOutput,
                    cwd: directory,
                    timestamp: Date.now()
                });
                _debug && console.log(`[CLAUDE_MEM] ✅ Observation added: ${input.tool}`);
            }
            catch (error) {
                console.error('[CLAUDE_MEM] Failed to capture tool usage:', error);
            }
        },
        /**
         * Tool hook - Expose claude-mem as a searchable tool
         * Allows manual memory operations
         */
        tool: {
            'claude-mem': tool({
                description: "Search and manage persistent memory from claude-mem. Use to find relevant context from past coding sessions, patterns, error solutions, and project knowledge.",
                args: {
                    mode: tool.schema
                        .enum(['search', 'status', 'list'])
                        .optional()
                        .describe('Operation mode: search memories, check worker status, or list recent memories'),
                    query: tool.schema
                        .string()
                        .optional()
                        .describe('Search query for semantic memory search (e.g., "authentication bug fix")'),
                    limit: tool.schema
                        .number()
                        .optional()
                        .describe('Maximum number of results to return (default: 10)'),
                    type: tool.schema
                        .enum(['all', 'code', 'file', 'web', 'bash'])
                        .optional()
                        .describe('Filter memories by type'),
                    project: tool.schema
                        .string()
                        .optional()
                        .describe('Project name to search (default: current project)')
                },
                async execute(args, toolCtx) {
                    try {
                        const state = sessionStates.get(toolCtx.sessionID);
                        if (!state || !state.claudeMemSessionId) {
                            return JSON.stringify({
                                success: false,
                                error: 'No active claude-mem session for this OpenCode session'
                            });
                        }
                        switch (args.mode || 'search') {
                            case 'search': {
                                if (!args.query) {
                                    return JSON.stringify({
                                        success: false,
                                        error: 'Query parameter is required for search mode'
                                    });
                                }
                                _debug && console.log(`[CLAUDE_MEM] Searching: ${args.query}`);
                                const response = await workerClient.search(args.query, {
                                    limit: args.limit || 10,
                                    type: args.type,
                                    project: args.project || projectName
                                });
                                if (!response.success) {
                                    return JSON.stringify({
                                        success: false,
                                        error: response.error || 'Search failed'
                                    });
                                }
                                return JSON.stringify({
                                    success: true,
                                    mode: 'search',
                                    query: args.query,
                                    project: args.project || projectName,
                                    count: response.results?.length || 0,
                                    results: response.results?.map((r) => ({
                                        id: r.id,
                                        type: r.type,
                                        content: r.content || r.summary,
                                        timestamp: r.created_at,
                                        similarity: r.similarity ? Math.round(r.similarity * 100) : null
                                    }))
                                });
                            }
                            case 'status': {
                                const healthCheck = await workerClient.healthCheck();
                                return JSON.stringify({
                                    success: true,
                                    mode: 'status',
                                    worker: {
                                        connected: healthCheck,
                                        port: config.workerPort
                                    },
                                    session: {
                                        id: toolCtx.sessionID,
                                        claudeMemId: state.claudeMemSessionId,
                                        project: state.projectName,
                                        contextInjected: state.contextInjected
                                    }
                                });
                            }
                            case 'list': {
                                const response = await workerClient.search('', {
                                    limit: args.limit || 20,
                                    project: args.project || projectName
                                });
                                if (!response.success) {
                                    return JSON.stringify({
                                        success: false,
                                        error: response.error || 'List failed'
                                    });
                                }
                                return JSON.stringify({
                                    success: true,
                                    mode: 'list',
                                    project: args.project || projectName,
                                    count: response.results?.length || 0,
                                    memories: response.results?.map((r) => ({
                                        id: r.id,
                                        type: r.type,
                                        summary: r.summary,
                                        created_at: r.created_at
                                    }))
                                });
                            }
                            default: {
                                return JSON.stringify({
                                    success: false,
                                    error: `Unknown mode: ${args.mode}. Valid modes: search, status, list`
                                });
                            }
                        }
                    }
                    catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        console.error('[CLAUDE_MEM] Tool execution error:', errorMsg);
                        return JSON.stringify({
                            success: false,
                            error: errorMsg
                        });
                    }
                }
            })
        }
    };
};
export default ClaudeMemPlugin;
/**
 * Handle session creation event
 * Initialize claude-mem session and track mapping
 */
async function handleSessionCreated(event, sessionStates, workerClient, projectName, privacyStripper) {
    const { info } = event.properties;
    const sessionId = info.id;
    const title = info.title || 'New session';
    // Check for private session indicators
    const isPrivate = isSessionPrivate(info, privacyStripper);
    if (isPrivate) {
        _debug && console.log(`[CLAUDE_MEM] Skipping private session: ${sessionId}`);
        sessionStates.set(sessionId, {
            sessionId,
            claudeMemSessionId: null,
            contextInjected: true,
            isPrivate: true,
            projectName,
            promptNumber: 1
        });
        return;
    }
    try {
        // Initialize claude-mem session
        const response = await workerClient.initSession({
            contentSessionId: sessionId,
            project: projectName,
            prompt: title
        });
        if (response.skipped) {
            _debug && console.log(`[CLAUDE_MEM] Session marked as private: ${sessionId}`);
            _debug && console.log(`[CLAUDE_MEM] Reason: ${response.reason}`);
            sessionStates.set(sessionId, {
                sessionId,
                claudeMemSessionId: null,
                contextInjected: true,
                isPrivate: true,
                projectName,
                promptNumber: 1
            });
            return;
        }
        // Track session mapping
        sessionStates.set(sessionId, {
            sessionId,
            claudeMemSessionId: response.sessionDbId,
            contextInjected: false,
            isPrivate: false,
            projectName,
            promptNumber: response.promptNumber || 1
        });
        _debug && console.log(`[CLAUDE_MEM] Session ${sessionId} → ${response.sessionDbId}`);
    }
    catch (error) {
        console.error(`[CLAUDE_MEM] Failed to initialize session ${sessionId}:`, error);
    }
}
/**
 * Handle session updated event
 * Complete claude-mem session when archived
 */
async function handleSessionUpdated(event, sessionStates, workerClient) {
    const { info } = event.properties;
    const sessionId = info.id;
    // Only complete on archive
    if (!info.time?.archived) {
        return;
    }
    const state = sessionStates.get(sessionId);
    if (!state || !state.claudeMemSessionId || state.isPrivate) {
        return;
    }
    try {
        _debug && console.log(`[CLAUDE_MEM] Completing session: ${sessionId}`);
        await workerClient.completeSession(state.claudeMemSessionId);
        _debug && console.log(`[CLAUDE_MEM] ✅ Session completed: ${state.claudeMemSessionId}`);
        // Clean up state
        sessionStates.delete(sessionId);
    }
    catch (error) {
        console.error(`[CLAUDE_MEM] Failed to complete session ${sessionId}:`, error);
    }
}
/**
 * Check if session should be treated as private
 */
function isSessionPrivate(sessionInfo, privacyStripper) {
    const title = (sessionInfo.title || '').toLowerCase();
    // Check title for private keywords
    const privateKeywords = ['private', 'secret', 'confidential', 'test', 'tmp'];
    const hasPrivateKeyword = privateKeywords.some(keyword => title.includes(keyword));
    if (hasPrivateKeyword) {
        return true;
    }
    // Check for private tags in message/prompt
    if (sessionInfo.message || sessionInfo.prompt) {
        const content = sessionInfo.message || sessionInfo.prompt;
        const hasPrivacyTags = privacyStripper.hasPrivacyTags(content);
        if (hasPrivacyTags) {
            return true;
        }
    }
    return false;
}
/**
 * Format memories for prompt injection
 */
function formatContextForPrompt(memories, projectName) {
    if (memories.length === 0) {
        return '';
    }
    const parts = [];
    parts.push('[CLAUDE-MEM]');
    parts.push(`\nProject: ${projectName}`);
    parts.push(`\nRelevant Memories (${memories.length}):`);
    memories.forEach((mem, index) => {
        const similarity = mem.similarity ? Math.round(mem.similarity * 100) : null;
        const type = mem.type || 'observation';
        const content = mem.content || mem.summary || '';
        parts.push(`\n${index + 1}. [${type}] ${similarity ? `${similarity}% match` : ''}`);
        parts.push(`   ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
    });
    return parts.join('\n');
}
//# sourceMappingURL=plugin.js.map