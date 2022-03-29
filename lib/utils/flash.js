"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toHex = exports.getFlashArgs = exports.appendFlashConfig = void 0;
const lisa_core_1 = require("@listenai/lisa_core");
const lodash_1 = require("lodash");
const fs_extra_1 = require("fs-extra");
function getContext(ctx) {
    ctx.flash = ctx.flash || [];
    return ctx;
}
function appendFlashConfig(ctx, tag, addr, file) {
    const { flash } = getContext(ctx);
    flash.push({ tag, addr, file });
}
exports.appendFlashConfig = appendFlashConfig;
async function getFlashArgs(ctx, tag) {
    const flash = (0, lodash_1.sortBy)(getContext(ctx).flash, ['addr']);
    lisa_core_1.default.application.debug({ flash });
    const flashArgs = {};
    let last;
    for (const cfg of flash) {
        if (tag && cfg.tag != tag)
            continue;
        if (last && cfg.addr < last.addr + last.size) {
            const myAddr = toHex(cfg.addr);
            const lastRange = `${toHex(last.addr)}-${toHex(last.addr + last.size)}`;
            throw new Error(`${cfg.tag} 分区 (${myAddr}) 与 ${last.tag} 分区 (${lastRange}) 重叠`);
        }
        const s = await (0, fs_extra_1.stat)(cfg.file);
        last = { ...cfg, size: s.size };
        flashArgs[cfg.addr] = cfg.file;
    }
    return flashArgs;
}
exports.getFlashArgs = getFlashArgs;
function toHex(addr) {
    return `0x${addr.toString(16).padStart(8, '0')}`;
}
exports.toHex = toHex;
