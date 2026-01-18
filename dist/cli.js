#!/usr/bin/env bun
/**
 * CLI tool for opencode-mem
 */
import { ClaudeMemIntegration } from './integration/index.js';
import { Logger } from './integration/utils/logger.js';
const logger = new Logger('CLI');
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    if (!command || command === '--help' || command === '-h') {
        printHelp();
        return;
    }
    if (command === '--version' || command === '-v') {
        const packageJson = await import('../package.json');
        console.log(`opencode-mem v${packageJson.version}`);
        return;
    }
    switch (command) {
        case 'check-compatibility':
            await checkCompatibility();
            break;
        case 'status':
            await getStatus();
            break;
        case 'search':
            await searchMemory(args[1]);
            break;
        case 'context':
            await getContext(args[1]);
            break;
        default:
            console.error(`Unknown command: ${command}`);
            printHelp();
            process.exit(1);
    }
}
function printHelp() {
    console.log(`
opencode-mem - OpenCode integration for claude-mem

Usage:
  opencode-mem <command> [options]

Commands:
  check-compatibility  Check compatibility with claude-mem
  status              Show integration status
  search <query>      Search memories
  context [project]    Get context for project

Options:
  --help, -h          Show this help message
  --version, -v       Show version

Examples:
  opencode-mem check-compatibility
  opencode-mem search "authentication"
  opencode-mem context my-project

Documentation: https://github.com/your-org/opencode-mem
`);
}
async function checkCompatibility() {
    logger.info('Checking compatibility with claude-mem...');
    try {
        const integration = new ClaudeMemIntegration();
        await integration.initialize();
        const checker = integration.getVersionChecker();
        const result = await checker.checkCompatibility();
        console.log('');
        console.log('Compatibility Result:');
        console.log(`  Worker Version: ${result.workerVersion}`);
        console.log(`  API Version: ${result.apiVersion}`);
        console.log(`  Compatible: ${result.isCompatible ? 'Yes' : 'No'}`);
        console.log(`  Tested: ${result.isTested ? 'Yes' : 'No'}`);
        console.log('');
        console.log(`Recommendation: ${result.recommendation}`);
        console.log('');
        if (result.testedVersions.length > 0) {
            console.log(`Tested Versions: ${result.testedVersions.slice(0, 5).join(', ')}`);
        }
        await integration.shutdown();
    }
    catch (error) {
        logger.error('Compatibility check failed:', error);
        process.exit(1);
    }
}
async function getStatus() {
    logger.info('Getting integration status...');
    try {
        const integration = new ClaudeMemIntegration();
        await integration.initialize();
        const status = await integration.getStatus();
        console.log('');
        console.log('Integration Status:');
        console.log(`  Initialized: ${status.initialized ? 'Yes' : 'No'}`);
        console.log(`  Worker Ready: ${status.workerReady ? 'Yes' : 'No'}`);
        console.log(`  Worker Version: ${status.workerVersion || 'N/A'}`);
        console.log(`  Current Project: ${status.currentProject}`);
        console.log(`  Worker URL: ${status.workerUrl}`);
        console.log('');
        await integration.shutdown();
    }
    catch (error) {
        logger.error('Status check failed:', error);
        process.exit(1);
    }
}
async function searchMemory(query) {
    if (!query) {
        console.error('Error: query is required');
        console.error('Usage: opencode-mem search <query>');
        process.exit(1);
    }
    logger.info(`Searching memories: "${query}"`);
    try {
        const integration = new ClaudeMemIntegration();
        await integration.initialize();
        const results = await integration.searchMemory(query);
        console.log('');
        console.log(`Found ${results.total} results:`);
        console.log('');
        results.results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.toolName}`);
            console.log(`   ${result.summary}`);
            console.log(`   ${new Date(result.timestamp).toISOString()}`);
            console.log('');
        });
        await integration.shutdown();
    }
    catch (error) {
        logger.error('Search failed:', error);
        process.exit(1);
    }
}
async function getContext(project) {
    logger.info('Getting project context...');
    try {
        const integration = new ClaudeMemIntegration();
        await integration.initialize();
        const context = await integration.getProjectContext(project);
        console.log('');
        if (context) {
            console.log('Context:');
            console.log(context);
            console.log('');
        }
        else {
            console.log('No context available');
        }
        await integration.shutdown();
    }
    catch (error) {
        logger.error('Get context failed:', error);
        process.exit(1);
    }
}
main().catch(error => {
    logger.error('CLI error:', error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map