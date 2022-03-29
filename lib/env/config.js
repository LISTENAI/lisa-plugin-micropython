"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.set = exports.get = exports.getFromZep = exports.ZEP_PLUGIN_HOME = exports.PLUGIN_HOME = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const os_1 = require("os");
exports.PLUGIN_HOME = (0, path_1.join)((0, os_1.homedir)(), '.listenai', 'lisa-micropython');
exports.ZEP_PLUGIN_HOME = (0, path_1.join)((0, os_1.homedir)(), '.listenai', 'lisa-zephyr');
const CONFIG_FILE = (0, path_1.join)(exports.PLUGIN_HOME, 'config.json');
const ZEPHYR_CONFIG_FILE = (0, path_1.join)(exports.PLUGIN_HOME, '..', 'lisa-zephyr', 'config.json');
async function load(configFile = CONFIG_FILE) {
    if (!(await (0, fs_extra_1.pathExists)(configFile)))
        return null;
    return await (0, fs_extra_1.readJson)(configFile);
}
async function getFromZep(key) {
    const config = await load(ZEPHYR_CONFIG_FILE);
    if (config && typeof config.env == 'string') {
        config.env = [config.env]; // 向后兼容
    }
    return config ? config[key] : undefined;
}
exports.getFromZep = getFromZep;
async function get(key) {
    const config = await load();
    if (config && typeof config.env == 'string') {
        config.env = [config.env]; // 向后兼容
    }
    return config ? config[key] : undefined;
}
exports.get = get;
async function set(key, val) {
    const config = (await load()) || {};
    config[key] = val;
    await (0, fs_extra_1.writeJson)(CONFIG_FILE, config);
}
exports.set = set;
