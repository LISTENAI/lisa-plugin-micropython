"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisa_core_1 = require("@listenai/lisa_core");
function extendExec(cmd, extend = {}) {
    return (file, args, opts) => {
        opts = {
            stdio: 'inherit',
            ...extend,
            ...opts,
            env: {
                ...extend.env,
                ...opts?.env,
            },
        };
        lisa_core_1.default.application.debug('exec', { file, args, opts });
        const exec = cmd(file, args, opts);
        const { task } = extend;
        if (task) {
            let title = null;
            exec.once('spawn', () => {
                title = task.title;
                task.title = '';
            });
            exec.once('close', () => {
                if (title)
                    task.title = title;
            });
        }
        return exec;
    };
}
exports.default = extendExec;
