"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitPath = exports.makePath = exports.SYSTEM_PATHS = exports.KEY_OF_PATH = void 0;
const path_1 = require("path");
function findPathKey() {
    for (const key in process.env) {
        if (key.toLowerCase() == 'path') {
            return key;
        }
    }
    return 'PATH';
}
exports.KEY_OF_PATH = findPathKey();
exports.SYSTEM_PATHS = splitPath(process.env[exports.KEY_OF_PATH]);
function makePath(paths) {
    return { [exports.KEY_OF_PATH]: paths.join(path_1.delimiter) };
}
exports.makePath = makePath;
function splitPath(path) {
    if (typeof path == 'string') {
        return path.split(path_1.delimiter);
    }
    else {
        return [];
    }
}
exports.splitPath = splitPath;
