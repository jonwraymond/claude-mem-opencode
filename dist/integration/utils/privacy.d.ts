/**
 * Strip privacy tags from text and JSON
 * Consistent with claude-mem's tag-stripping logic
 */
export declare class PrivacyTagStripper {
    private readonly PRIVATE_TAG_REGEX;
    private readonly CONTEXT_TAG_REGEX;
    /**
     * Strip privacy tags from text
     */
    stripFromText(text: string): string;
    /**
     * Strip privacy tags from JSON (recursive)
     */
    stripFromJson(obj: any): any;
    /**
     * Check if text contains only private content
     */
    isFullyPrivate(text: string): boolean;
    /**
     * Check if text contains privacy tags
     */
    hasPrivacyTags(text: string): boolean;
    /**
     * Count privacy tags in text
     */
    countPrivacyTags(text: string): {
        private: number;
        context: number;
    };
}
//# sourceMappingURL=privacy.d.ts.map