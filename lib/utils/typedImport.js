"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function typedImport(name) {
    const mod = (await Promise.resolve().then(() => require(name)));
    return mod.default;
}
exports.default = typedImport;
