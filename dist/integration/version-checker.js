/**
 * Runtime claude-mem version compatibility checker
 */
export class VersionChecker {
    workerUrl;
    COMPATIBILITY_FILE = 'COMPATIBILITY.md';
    constructor(workerUrl = 'http://localhost:37777') {
        this.workerUrl = workerUrl;
    }
    /**
     * Check worker health and version
     */
    async checkWorkerHealth() {
        const response = await fetch(`${this.workerUrl}/api/health`);
        if (!response.ok) {
            throw new Error(`Worker health check failed: ${response.status}`);
        }
        return await response.json();
    }
    /**
     * Parse COMPATIBILITY.md to get tested versions
     */
    async getTestedVersions() {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const compatPath = path.join(process.cwd(), this.COMPATIBILITY_FILE);
            const content = await fs.readFile(compatPath, 'utf-8');
            const lines = content.split('\n');
            const versions = [];
            const sectionRegex = /- claude-mem v(\d+\.\d+\.\d+):\s*(✅|❌|⚠️)\s*(Compatible|Incompatible|Unknown)\s*\((\d{4}-\d{2}-\d{2})\)/;
            for (const line of lines) {
                const match = line.match(sectionRegex);
                if (match) {
                    versions.push({
                        version: match[1],
                        status: match[2] === '✅' ? 'compatible' : match[2] === '❌' ? 'incompatible' : 'unknown',
                        date: match[4]
                    });
                }
            }
            return versions;
        }
        catch (error) {
            console.warn('[VERSION_CHECKER] Could not read COMPATIBILITY.md');
            return [];
        }
    }
    /**
     * Check if a specific version has been tested
     */
    isVersionTested(version, testedVersions) {
        return testedVersions.some(v => v.version === version && v.status === 'compatible');
    }
    /**
     * Check API version compatibility
     */
    isApiVersionCompatible(apiVersion) {
        const supportedVersions = ['1.0', '2.0'];
        return supportedVersions.includes(apiVersion);
    }
    /**
     * Full compatibility check
     */
    async checkCompatibility() {
        const health = await this.checkWorkerHealth();
        const testedVersions = await this.getTestedVersions();
        const isTested = this.isVersionTested(health.version, testedVersions);
        const isCompatible = this.isApiVersionCompatible(health.apiVersion);
        const testedVersionList = testedVersions
            .filter(v => v.status === 'compatible')
            .map(v => v.version)
            .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
        let recommendation;
        if (!isCompatible) {
            recommendation = `❌ Incompatible API version: ${health.apiVersion}. ` +
                `Supported: 1.0, 2.0. ` +
                `Please update claude-mem or opencode-mem.`;
        }
        else if (!isTested) {
            recommendation = `⚠️ This claude-mem version (${health.version}) has not been tested ` +
                `with this version of opencode-mem. ` +
                `Tested versions: ${testedVersionList.slice(0, 5).join(', ')}. ` +
                `Proceed with caution.`;
        }
        else {
            recommendation = `✅ claude-mem v${health.version} is fully compatible and tested.`;
        }
        return {
            isCompatible,
            isTested,
            workerVersion: health.version,
            apiVersion: health.apiVersion,
            recommendation,
            testedVersions: testedVersionList
        };
    }
    /**
     * Log compatibility warning if needed
     */
    async logCompatibilityWarning() {
        try {
            const result = await this.checkCompatibility();
            if (!result.isCompatible) {
                console.error(result.recommendation);
                throw new Error('Incompatible claude-mem version');
            }
            else if (!result.isTested) {
                console.warn(result.recommendation);
            }
            else {
                console.log(result.recommendation);
            }
        }
        catch (error) {
            console.error('[VERSION_CHECKER] Compatibility check failed:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=version-checker.js.map