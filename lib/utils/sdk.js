"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mpyVersion = exports.zephyrVersion = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
async function zephyrVersion(path) {
    if (!(await (0, fs_extra_1.pathExists)((0, path_1.join)(path, 'west.yml')))) {
        return null;
    }
    if (!(await (0, fs_extra_1.pathExists)((0, path_1.join)(path, 'VERSION')))) {
        return null;
    }
    const version = await parseVersion((0, path_1.join)(path, 'VERSION'));
    return `${version.VERSION_MAJOR}.${version.VERSION_MINOR}.${version.PATCHLEVEL}`;
}
exports.zephyrVersion = zephyrVersion;
async function mpyVersion(path) {
    if (!(await (0, fs_extra_1.pathExists)((0, path_1.join)(path, 'VERSION')))) {
        return null;
    }
    const version = await parseVersion((0, path_1.join)(path, 'VERSION'));
    return `${version.VERSION_LISA_MAJOR}.${version.VERSION_LISA_MINOR}@${version.VERSION_MAJOR}.${version.VERSION_MINOR}`;
}
exports.mpyVersion = mpyVersion;
async function parseVersion(path) {
    const version = await (0, fs_extra_1.readFile)(path, { encoding: 'utf-8' });
    const result = {};
    for (const line of version.split('\n')) {
        if (line.trim().match(/^([^=]+) = (\d+)/)) {
            result[RegExp.$1] = parseInt(RegExp.$2);
        }
    }
    return result;
}
