"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCMakeCache = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
async function getCMakeCache(buildDir, key, type) {
    const cacheFile = (0, path_1.join)(buildDir, 'CMakeCache.txt');
    if (!(await (0, fs_extra_1.pathExists)(cacheFile)))
        return;
    const cache = await (0, fs_extra_1.readFile)(cacheFile, { encoding: 'utf-8' });
    const leading = `${key}:${type}=`;
    for (const line of cache.split('\n')) {
        if (line.startsWith(leading)) {
            return line.substr(leading.length).trim();
        }
    }
}
exports.getCMakeCache = getCMakeCache;
