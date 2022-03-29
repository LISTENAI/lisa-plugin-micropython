"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBinaries = exports.loadBundles = exports.getFlasher = exports.invalidateEnv = exports.getEnv = exports.getZepEnv = exports.PACKAGE_HOME = void 0;
const path_1 = require("path");
const lodash_1 = require("lodash");
const fs_extra_1 = require("fs-extra");
const path_2 = require("../utils/path");
const typedImport_1 = require("../utils/typedImport");
const config_1 = require("./config");
exports.PACKAGE_HOME = (0, path_1.join)(config_1.PLUGIN_HOME, 'packages');
const PACKAGE_MODULES_DIR = (0, path_1.join)(exports.PACKAGE_HOME, 'node_modules');
const ENV_CACHE_DIR = (0, path_1.join)(config_1.PLUGIN_HOME, 'envs');
const ZEP_ENV_CACHE_DIR = (0, path_1.join)(config_1.ZEP_PLUGIN_HOME, 'envs');
const PIP_INDEX_URL = process.env.PIP_INDEX_URL || 'https://pypi.tuna.tsinghua.edu.cn/simple';
const BUILTIN_BINARIES = ['../venv'];
async function getZepEnv(override) {
    const escape = (name) => name.replaceAll('/', '_').replaceAll('\\', '_');
    const cacheName = override ? `cache_${escape(override)}.json` : 'cache.json';
    const cacheFile = (0, path_1.join)(ZEP_ENV_CACHE_DIR, cacheName);
    if (await (0, fs_extra_1.pathExists)(cacheFile)) {
        const env = await (0, fs_extra_1.readJson)(cacheFile);
        Object.assign(env, (0, path_2.makePath)([...(0, path_2.splitPath)(env[path_2.KEY_OF_PATH]), ...path_2.SYSTEM_PATHS]));
        return env;
    }
    return null;
}
exports.getZepEnv = getZepEnv;
/**
 *
 * @deprecated Should replace with lisa_core version
 * @param override
 * @returns
 */
async function getEnv(override) {
    const escape = (name) => name.replaceAll('/', '_').replaceAll('\\', '_');
    const cacheName = override ? `cache_${escape(override)}.json` : 'cache.json';
    const cacheFile = (0, path_1.join)(ENV_CACHE_DIR, cacheName);
    if (await (0, fs_extra_1.pathExists)(cacheFile)) {
        const env = await (0, fs_extra_1.readJson)(cacheFile);
        Object.assign(env, (0, path_2.makePath)([...(0, path_2.splitPath)(env[path_2.KEY_OF_PATH]), ...path_2.SYSTEM_PATHS]));
        return env;
    }
    else {
        const env = await makeEnv(override);
        await (0, fs_extra_1.outputJson)(cacheFile, env);
        Object.assign(env, (0, path_2.makePath)([...(0, path_2.splitPath)(env[path_2.KEY_OF_PATH]), ...path_2.SYSTEM_PATHS]));
        return env;
    }
}
exports.getEnv = getEnv;
async function invalidateEnv() {
    await (0, fs_extra_1.remove)(ENV_CACHE_DIR);
}
exports.invalidateEnv = invalidateEnv;
async function getFlasher(override) {
    const envs = (await (0, config_1.get)('env')) || [];
    if (override)
        envs.unshift(override);
    const bundles = await loadBundles((0, lodash_1.uniq)(envs));
    if (bundles.length == 0)
        return undefined;
    return bundles[0].flasher;
}
exports.getFlasher = getFlasher;
async function loadBundles(envs) {
    if (!envs)
        return [];
    try {
        return await Promise.all(envs.map((name) => (0, typedImport_1.default)(`${PACKAGE_MODULES_DIR}/@lisa-env/${name}`)));
    }
    catch (e) {
        return [];
    }
}
exports.loadBundles = loadBundles;
async function loadBinaries(bundles) {
    const binaries = {};
    for (const name of BUILTIN_BINARIES) {
        const unprefixedName = name.split('/').slice(1).join('/');
        binaries[unprefixedName] = await (0, typedImport_1.default)(name);
    }
    for (const bundle of bundles || []) {
        for (const name of bundle.binaries || []) {
            binaries[name] = await (0, typedImport_1.default)(`${PACKAGE_MODULES_DIR}/@binary/${name}`);
        }
    }
    return binaries;
}
exports.loadBinaries = loadBinaries;
async function makeEnv(override) {
    const env = {};
    const binaries = [];
    const libraries = [];
    const envs = (await (0, config_1.get)('env')) || [];
    if (override)
        envs.unshift(override);
    const bundles = await loadBundles((0, lodash_1.uniq)(envs));
    for (const binary of Object.values(await loadBinaries(bundles))) {
        if (binary.env) {
            Object.assign(env, binary.env);
        }
        binaries.push(binary.binaryDir);
        if (binary.libraryDir) {
            libraries.push(binary.libraryDir);
        }
    }
    const sdk = await (0, config_1.get)('sdk');
    if (sdk) {
        env['MICROPY_SDK'] = sdk;
    }
    Object.assign(env, {
        PIP_INDEX_URL,
    });
    if (bundles.length > 0) {
        const masterBundle = bundles[0];
        Object.assign(env, masterBundle.env);
        for (const bundle of bundles.slice(1)) {
            (0, lodash_1.defaults)(env, bundle.env);
        }
    }
    Object.assign(env, (0, path_2.makePath)(binaries));
    return env;
}
