"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDT = void 0;
const lisa_core_1 = require("@listenai/lisa_core");
const path_1 = require("path");
async function loadDT(buildDir, env) {
    const { stdout } = await lisa_core_1.default.cmd('python', [
        (0, path_1.resolve)(__dirname, '..', '..', 'scripts', 'edt2json.py'),
        '--dtlib', (0, path_1.resolve)(env.ZEPHYR_BASE, 'scripts', 'dts', 'python-devicetree', 'src'),
        '--edt-pickle', (0, path_1.resolve)(buildDir, 'zephyr', 'edt.pickle'),
    ], { env });
    const dt = JSON.parse(stdout);
    return new DeviceTreeParser(dt);
}
exports.loadDT = loadDT;
class DeviceTreeParser {
    chosens = {};
    labels = {};
    nodes = {};
    constructor(dt) {
        Object.assign(this, dt);
    }
    choose(name) {
        const path = this.chosens[name];
        if (!path)
            return null;
        return this.nodes[path] || null;
    }
    label(label) {
        const path = this.labels[label];
        if (!path)
            return null;
        return this.nodes[path] || null;
    }
    node(path) {
        return this.nodes[path] || null;
    }
    labelNameByPath(path) {
        return Object.keys(this.labels).find(labelName => this.labels[labelName] === path) || null;
    }
    under(parent) {
        return Object.keys(this.nodes)
            .filter(path => isChild(parent, path))
            .map(path => this.nodes[path])
            .filter(node => !!node);
    }
}
exports.default = DeviceTreeParser;
function isChild(parent, path) {
    return path.startsWith(`${parent}/`) &&
        !path.substr(parent.length + 1).includes('/');
}
