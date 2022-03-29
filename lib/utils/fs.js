"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.path2json = exports.checkFsFilter = exports.parsePartitions = void 0;
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
function parsePartitions(dt) {
    const partitions = [];
    for (const node of Object.values(dt.nodes)) {
        if (node.compatible?.includes('zephyr,fstab,littlefs')) {
            const path = node.properties.partition;
            if (typeof path != 'string')
                continue;
            const labelName = dt.labelNameByPath(node.path);
            if (typeof labelName != 'string')
                continue;
            const part = dt.node(path);
            // if (!part?.label) continue;
            if (!part?.reg || !part?.reg[0])
                continue;
            const reg = part.reg[0];
            if (typeof reg.addr != 'number' || typeof reg.size != 'number')
                continue;
            partitions.push({
                label: labelName,
                addr: reg.addr,
                size: reg.size,
                type: 'littlefs',
            });
        }
    }
    return partitions;
}
exports.parsePartitions = parsePartitions;
async function checkFsFilter(label, fsFilter, prePath) {
    const filter = fsFilter[label];
    if (!filter)
        return;
    if (typeof filter === 'string') {
        if (!(await (0, fs_extra_1.pathExists)((0, path_1.join)(prePath, filter)))) {
            throw new Error(`文件系统检测缺失${label}资源：${(0, path_1.join)(prePath, filter)}`);
        }
    }
    else {
        for (const part of Object.keys(filter)) {
            await checkFsFilter(part, filter, (0, path_1.join)(prePath, label));
        }
    }
}
exports.checkFsFilter = checkFsFilter;
async function path2json(dirParse, json) {
    if (!dirParse.length)
        return json;
    const dir = dirParse.shift();
    if (dir) {
        if (typeof json[dir] === 'string') {
            return json;
        }
        json[dir] = dirParse.length ? await path2json(dirParse, (json[dir] || {})) : dir;
    }
    else {
        return await path2json(dirParse, json);
    }
    return json;
}
exports.path2json = path2json;
