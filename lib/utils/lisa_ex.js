"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.job = void 0;
const lisa_core_1 = require("@listenai/lisa_core");
function job(cmdName, task) {
    if (task.before || task.after) {
        const _task = task;
        task = {
            ...task,
            task: (ctx, task) => {
                let tasks = [];
                if (_task.before) {
                    tasks = [...tasks, ..._task.before(ctx)];
                }
                tasks.push({ ..._task, title: undefined });
                if (_task.after) {
                    tasks = [...tasks, ..._task.after(ctx)];
                }
                return task.newListr(tasks);
            },
        };
    }
    if (task.hideTitle) {
        const _task = task.task;
        task.task = (ctx, task) => {
            task.title = '';
            return _task(ctx, task);
        };
    }
    lisa_core_1.default.job(cmdName, task);
}
exports.job = job;
