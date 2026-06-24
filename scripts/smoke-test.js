const fs = require('fs');
const path = require('path');

const { ensureNativeDependencies, isSupportedNodeVersion } = require('./verify-native-deps');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DUMMY_TOKEN = 'dummy.header.signature';

function walkJavaScriptFiles(directory) {
    const files = [];

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...walkJavaScriptFiles(entryPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(entryPath);
        }
    }

    return files;
}

function requireFresh(filePath) {
    const resolved = require.resolve(filePath);
    delete require.cache[resolved];
    return require(resolved);
}

function validateRuntime() {
    if (!isSupportedNodeVersion()) {
        throw new Error(`Unsupported Node.js ${process.versions.node}. Supported runtime: Node.js 22.x, 24.x, or 25.x.`);
    }
}

function validateNativeDependencies() {
    ensureNativeDependencies({ allowRebuild: false });
}

function validateConfig() {
    if (!process.env.BOT_TOKEN) {
        process.env.BOT_TOKEN = DUMMY_TOKEN;
    }

    const config = requireFresh(path.join(PROJECT_ROOT, 'src', 'config.js'));

    if (!config.token || config.token !== process.env.BOT_TOKEN) {
        throw new Error('Config did not load BOT_TOKEN correctly.');
    }

    if (!Array.isArray(config.nodes)) {
        throw new Error('Config nodes must be an array.');
    }
}

function validateCommands() {
    const commandsRoot = path.join(PROJECT_ROOT, 'src', 'commands');
    const failures = [];
    let count = 0;

    for (const category of fs.readdirSync(commandsRoot)) {
        const categoryPath = path.join(commandsRoot, category);
        if (!fs.statSync(categoryPath).isDirectory()) {
            continue;
        }

        for (const file of fs.readdirSync(categoryPath).filter((name) => name.endsWith('.js'))) {
            const filePath = path.join(categoryPath, file);
            const command = requireFresh(filePath);
            count++;

            if (!command.name) {
                failures.push(`${filePath}: missing command name`);
            }

            if (!command.category) {
                failures.push(`${filePath}: missing command category`);
            }

            if (
                typeof command.execute !== 'function' &&
                typeof command.slashExecute !== 'function' &&
                typeof command.run !== 'function'
            ) {
                failures.push(`${filePath}: missing execute/slashExecute/run handler`);
            }
        }
    }

    if (failures.length > 0) {
        throw new Error(failures.join('\n'));
    }

    return count;
}

function validateEvents() {
    const eventRoots = [
        path.join(PROJECT_ROOT, 'src', 'events', 'Client'),
        path.join(PROJECT_ROOT, 'src', 'events', 'Node'),
        path.join(PROJECT_ROOT, 'src', 'events', 'Players')
    ];

    const failures = [];
    let count = 0;

    for (const eventRoot of eventRoots) {
        for (const file of fs.readdirSync(eventRoot).filter((name) => name.endsWith('.js'))) {
            const filePath = path.join(eventRoot, file);
            const event = requireFresh(filePath);
            count++;

            if (!event.name) {
                failures.push(`${filePath}: missing event name`);
            }

            if (typeof event.run !== 'function') {
                failures.push(`${filePath}: missing run handler`);
            }
        }
    }

    if (failures.length > 0) {
        throw new Error(failures.join('\n'));
    }

    return count;
}

function validateModuleLoading() {
    const skip = new Set([
        path.join(PROJECT_ROOT, 'index.js'),
        path.join(PROJECT_ROOT, 'src', 'structures', 'MusicClient.js'),
        path.join(PROJECT_ROOT, 'src', 'structures', 'Database.js')
    ]);

    const failures = [];
    const files = [
        ...walkJavaScriptFiles(path.join(PROJECT_ROOT, 'scripts')),
        ...walkJavaScriptFiles(path.join(PROJECT_ROOT, 'src'))
    ];

    for (const file of files) {
        if (skip.has(file)) {
            continue;
        }

        try {
            requireFresh(file);
        } catch (error) {
            failures.push(`${file}: ${error.code || 'ERROR'}: ${error.message}`);
        }
    }

    if (failures.length > 0) {
        throw new Error(failures.join('\n'));
    }
}

function main() {
    validateRuntime();
    validateNativeDependencies();
    validateConfig();
    validateModuleLoading();

    const commandCount = validateCommands();
    const eventCount = validateEvents();

    console.log(`Smoke test passed: ${commandCount} commands and ${eventCount} events validated.`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

module.exports = {
    validateRuntime,
    validateNativeDependencies,
    validateConfig,
    validateCommands,
    validateEvents,
    validateModuleLoading
};
