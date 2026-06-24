const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MODULE_NAME = 'better-sqlite3';
const ADDON_RELATIVE_PATH = path.join('build', 'Release', 'better_sqlite3.node');

function parseNodeVersion(version) {
    const [major, minor, patch] = version.split('.').map((part) => Number.parseInt(part, 10));
    return { major, minor, patch };
}

function isSupportedNodeVersion(version = process.versions.node) {
    const { major } = parseNodeVersion(version);

    return major === 22 || major === 24 || major === 25;
}

function assertSupportedNodeVersion() {
    if (isSupportedNodeVersion()) {
        return;
    }

    throw new Error(
        `Unsupported Node.js ${process.versions.node}. ` +
        'Use Node.js 22 LTS when you can, Node.js 24 LTS, or Node.js 25 when that is the runtime provided by OriHost/Pterodactyl. ' +
        'Node.js 23 is intentionally excluded because it is already end-of-life.'
    );
}

function getExpectedFormat() {
    if (process.platform === 'win32') return 'pe';
    if (process.platform === 'linux' || process.platform === 'freebsd' || process.platform === 'openbsd') return 'elf';
    if (process.platform === 'darwin') return 'macho';
    return null;
}

function getFormatName(format) {
    const names = {
        elf: 'Linux/Unix ELF',
        pe: 'Windows PE',
        macho: 'macOS Mach-O',
        unknown: 'unknown'
    };

    return names[format] || format;
}

function detectNativeBinaryFormat(filePath) {
    const header = fs.readFileSync(filePath).subarray(0, 8);

    if (header[0] === 0x7f && header[1] === 0x45 && header[2] === 0x4c && header[3] === 0x46) {
        return 'elf';
    }

    if (header[0] === 0x4d && header[1] === 0x5a) {
        return 'pe';
    }

    const magic = header.subarray(0, 4).toString('hex');
    if (['feedface', 'feedfacf', 'cefaedfe', 'cffaedfe', 'cafebabe', 'cafebabf'].includes(magic)) {
        return 'macho';
    }

    return 'unknown';
}

function getModuleDir() {
    try {
        return path.dirname(require.resolve(`${MODULE_NAME}/package.json`, { paths: [PROJECT_ROOT] }));
    } catch (error) {
        return null;
    }
}

function removeBuildDirectory(moduleDir) {
    const buildDir = path.resolve(moduleDir, 'build');
    const resolvedModuleDir = path.resolve(moduleDir);

    if (!buildDir.startsWith(`${resolvedModuleDir}${path.sep}`) || !fs.existsSync(buildDir)) {
        return;
    }

    fs.rmSync(buildDir, { recursive: true, force: true });
}

function inspectNativeDependency() {
    const moduleDir = getModuleDir();

    if (!moduleDir) {
        return {
            ok: false,
            moduleDir: null,
            reason: `${MODULE_NAME} is not installed. Run npm ci on the target server.`
        };
    }

    const addonPath = path.join(moduleDir, ADDON_RELATIVE_PATH);

    if (!fs.existsSync(addonPath)) {
        return {
            ok: false,
            moduleDir,
            reason: `${ADDON_RELATIVE_PATH} is missing.`
        };
    }

    const expectedFormat = getExpectedFormat();
    const actualFormat = detectNativeBinaryFormat(addonPath);

    if (expectedFormat && actualFormat !== expectedFormat) {
        return {
            ok: false,
            moduleDir,
            reason:
                `${MODULE_NAME} native addon has ${getFormatName(actualFormat)} format, ` +
                `but ${process.platform} requires ${getFormatName(expectedFormat)}.`
        };
    }

    try {
        require(MODULE_NAME);
    } catch (error) {
        return {
            ok: false,
            moduleDir,
            reason: `${MODULE_NAME} failed to load: ${error.message}`
        };
    }

    return { ok: true, moduleDir, reason: null };
}

function rebuildNativeDependency() {
    const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(npmExecutable, ['rebuild', MODULE_NAME], {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        env: {
            ...process.env,
            AKARI_NATIVE_REBUILD: '1'
        }
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`npm rebuild ${MODULE_NAME} failed with exit code ${result.status}.`);
    }
}

function ensureNativeDependencies(options = {}) {
    const allowRebuild = options.allowRebuild !== false;

    assertSupportedNodeVersion();

    let inspection = inspectNativeDependency();
    if (inspection.ok) {
        return;
    }

    if (!allowRebuild || process.env.AKARI_NATIVE_REBUILD === '1') {
        throw new Error(inspection.reason);
    }

    console.warn(`[native] ${inspection.reason}`);
    console.warn(`[native] Rebuilding ${MODULE_NAME} for ${process.platform}/${process.arch}...`);

    if (inspection.moduleDir) {
        removeBuildDirectory(inspection.moduleDir);
    }

    rebuildNativeDependency();

    inspection = inspectNativeDependency();
    if (!inspection.ok) {
        throw new Error(inspection.reason);
    }
}

if (require.main === module) {
    try {
        ensureNativeDependencies();
    } catch (error) {
        console.error(`[native] ${error.message}`);
        process.exit(1);
    }
}

module.exports = {
    ensureNativeDependencies,
    isSupportedNodeVersion
};
