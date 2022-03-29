"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKconfig = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
async function getKconfig(buildDir, key) {
    const kconfigFile = (0, path_1.join)(buildDir, 'zephyr', '.config');
    if (!(await (0, fs_extra_1.pathExists)(kconfigFile)))
        return;
    const cache = await (0, fs_extra_1.readFile)(kconfigFile, { encoding: 'utf-8' });
    const leading = `${key}=`;
    for (const line of cache.split('\n')) {
        if (line.startsWith(leading)) {
            return line.substr(leading.length).trim();
        }
    }
}
exports.getKconfig = getKconfig;
