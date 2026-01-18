/**
 * Extract project name from directory path
 * Consistent with claude-mem's project name logic
 */
export declare class ProjectNameExtractor {
    /**
     * Extract project name from directory
     * Uses same logic as claude-mem's getProjectName()
     */
    extract(directory: string): string;
    /**
     * Extract project name for current directory
     */
    getCurrentProject(): string;
}
//# sourceMappingURL=project-name.d.ts.map