"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.undertake = exports.exportEnv = exports.env = void 0;
const util_1 = require("util");
const child_process_1 = require("child_process");
const lodash_1 = require("lodash");
const fs_extra_1 = require("fs-extra");
const env_1 = require("./env");
const config_1 = require("./env/config");
const sdk_1 = require("./utils/sdk");
const repo_1 = require("./utils/repo");
const lisa_core_1 = require("@listenai/lisa_core");
const execFile = (0, util_1.promisify)(child_process_1.execFile);
async function env() {
    const env = await (0, config_1.getFromZep)('env');
    const bundles = await (0, env_1.loadBundles)(env);
    const versions = {};
    const variables = {};
    for (const [name, binary] of Object.entries(await (0, env_1.loadBinaries)(bundles))) {
        try {
            versions[name] = await binary.version();
        }
        catch (e) {
            versions[name] = '(缺失)';
        }
        Object.assign(variables, binary.env);
    }
    if (bundles.length > 0) {
        const masterBundle = bundles[0];
        Object.assign(variables, masterBundle.env);
        for (const bundle of bundles.slice(1)) {
            (0, lodash_1.defaults)(variables, bundle.env);
        }
    }
    return {
        zephyr_env: env && env.length > 0 ? env.join(', ') : '(未设置)',
        mpremote: (await getMPRemoteVersion()) || '(未安装)',
        lisa_zephyr: (await getZepPluginVersion()) || '(未安装)',
        ...versions,
        ZEPHYR_BASE: (await getZephyrInfo()) || '(未设置)',
        MICROPY_SDK: (await getMpyInfo()) || '(未设置)',
        PLUGIN_HOME: config_1.PLUGIN_HOME,
        ...variables,
    };
}
exports.env = env;
async function getZepPluginVersion() {
    try {
        const { stdout } = await execFile('npm', ['list', '-g', '--depth=0'], {
            env: await (0, env_1.getEnv)(),
        });
        return (stdout
            .trim()
            .split('\n')
            .find((line) => line.includes('@lisa-plugin/zephyr'))
            ?.split('@')
            .pop() || null);
    }
    catch (e) {
        return null;
    }
}
async function getMPRemoteVersion() {
    try {
        const { stdout } = await execFile('python', ['-m', 'pip', 'show', 'mpremote'], { env: await (0, env_1.getEnv)() });
        return (stdout
            .trim()
            .split('\n')
            .find((line) => line.startsWith('Version: ')) || null);
    }
    catch (e) {
        return null;
    }
}
async function getZephyrInfo() {
    const sdk = await (0, config_1.getFromZep)('sdk');
    if (!sdk)
        return null;
    if (!(await (0, fs_extra_1.pathExists)(sdk)))
        return null;
    const version = await (0, sdk_1.zephyrVersion)(sdk);
    const branch = await (0, repo_1.getRepoStatus)(sdk);
    if (branch) {
        return `${sdk} (版本: ${version}, 分支: ${branch})`;
    }
    else {
        return `${sdk} (版本: ${version})`;
    }
}
async function getMpyInfo() {
    const sdk = await (0, config_1.get)('sdk');
    if (!sdk)
        return null;
    if (!(await (0, fs_extra_1.pathExists)(sdk)))
        return null;
    const version = await (0, sdk_1.mpyVersion)(sdk);
    const branch = await (0, repo_1.getRepoStatus)(sdk);
    if (branch) {
        return `${sdk} (版本: ${version}, 分支: ${branch})`;
    }
    else {
        return `${sdk} (版本: ${version})`;
    }
}
exports.exportEnv = env_1.getEnv;
async function undertake(argv) {
    argv = argv ?? process.argv.slice(3);
    const { cmd } = lisa_core_1.default;
    try {
        await cmd('mpremote', argv, {
            stdio: 'inherit',
            env: await (0, env_1.getEnv)(),
        });
    }
    catch (error) { }
}
exports.undertake = undertake;
