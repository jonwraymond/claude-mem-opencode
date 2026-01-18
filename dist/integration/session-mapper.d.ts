/**
 * Map OpenCode session IDs to claude-mem session IDs
 */
export declare class SessionMapper {
    private mapping;
    /**
     * Map OpenCode session ID to claude-mem session ID
     */
    mapOpenCodeToClaudeMem(openCodeSessionId: string, claudeMemSessionId: number): void;
    /**
     * Get claude-mem session ID for OpenCode session
     */
    getClaudeMemSessionId(openCodeSessionId: string): number | undefined;
    /**
     * Get OpenCode session ID for claude-mem session
     */
    getOpenCodeSessionId(claudeMemSessionId: number): string | undefined;
    /**
     * Remove session mapping
     */
    unmapSession(openCodeSessionId: string): void;
    /**
     * Get all mappings
     */
    getAllMappings(): Map<string, number>;
    /**
     * Check if session is mapped
     */
    hasSession(openCodeSessionId: string): boolean;
    /**
     * Get number of mappings
     */
    size(): number;
    /**
     * Clear all mappings
     */
    clear(): void;
}
//# sourceMappingURL=session-mapper.d.ts.map