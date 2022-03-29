"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisa_core_1 = require("@listenai/lisa_core");
function parseArgs(argv, options) {
    const args = argv;
    const result = {};
    for (const key in options) {
        const opt = options[key];
        if (opt.short && args[opt.short]) {
            result[key] = args[opt.short];
        }
        else if (args[key]) {
            result[key] = args[key];
        }
    }
    return { args: result, printHelp: (usages) => printHelp(options, usages) };
}
exports.default = parseArgs;
function printHelp(options, usages) {
    process.nextTick(() => {
        if (usages && usages.length) {
            for (const usage of usages) {
                console.log(usage);
            }
            console.log('');
        }
        const helps = Object.entries(options).map(([key, opt]) => {
            let keys = opt.short ? `-${opt.short}, ` : '    ';
            keys += `--${key}`;
            if (opt.arg) {
                keys += ` <${opt.arg}>`;
            }
            else if (opt.optArg) {
                keys += ` [${opt.arg}]`;
            }
            return { keys, help: opt.help || '' };
        });
        console.log('选项:');
        lisa_core_1.default.cli.table(helps, {
            keys: { minWidth: 30 },
            help: {},
        }, { 'no-header': true });
    });
}
