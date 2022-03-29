"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisa_ex_1 = require("../utils/lisa_ex");
const parseArgs_1 = require("../utils/parseArgs");
const env_1 = require("../env");
// import parseArgs from '../utils/parseArgs';
// import extendExec from '../utils/extendExec';
// import { getFlashArgs, toHex } from '../utils/flash';
exports.default = ({ application, cmd, runner }) => {
    (0, lisa_ex_1.job)('build', {
        title: '构建',
        async task(ctx, task) {
            task.title = '';
            const argv = process.argv.slice(3);
            const env = Object.assign(await (0, env_1.getEnv)(), await (0, env_1.getZepEnv)());
            application.debug(env);
            await cmd('python', ['-m', 'west', ...argv], {
                stdio: 'inherit',
                env,
            });
        },
    });
    (0, lisa_ex_1.job)('flash', {
        title: '烧录',
        async task(ctx, task) {
            task.title = '';
            const { args, printHelp } = (0, parseArgs_1.default)(application.argv, {
                'fs-only': { help: '仅烧录文件系统' },
                'task-help': { short: 'h', help: '打印帮助' },
            });
            if (args['task-help']) {
                printHelp();
                return;
            }
            if (!args['fs-only']) {
                const argv = process.argv.slice(3);
                const env = Object.assign(await (0, env_1.getEnv)(), await (0, env_1.getZepEnv)());
                application.debug(env);
                await cmd('python', ['-m', 'west', ...argv], {
                    stdio: 'inherit',
                    env,
                });
            }
            await runner('fs:flash');
        },
    });
};
