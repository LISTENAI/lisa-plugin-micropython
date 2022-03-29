"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisa_ex_1 = require("../utils/lisa_ex");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const env_1 = require("../env");
const parseArgs_1 = require("../utils/parseArgs");
const extendExec_1 = require("../utils/extendExec");
const ux_1 = require("../utils/ux");
const cmake_1 = require("../utils/cmake");
const kconfig_1 = require("../utils/kconfig");
const flash_1 = require("../utils/flash");
async function getAppFlashAddr(buildDir) {
    const hasLoadOffset = await (0, kconfig_1.getKconfig)(buildDir, 'CONFIG_HAS_FLASH_LOAD_OFFSET');
    if (hasLoadOffset != 'y')
        return 0;
    const loadOffset = parseInt(await (0, kconfig_1.getKconfig)(buildDir, 'CONFIG_FLASH_LOAD_OFFSET') ?? '');
    return isNaN(loadOffset) ? 0 : loadOffset;
}
exports.default = ({ application, cmd }) => {
    (0, lisa_ex_1.job)('app:build', {
        title: '应用构建',
        async task(ctx, task) {
            const { args, printHelp } = (0, parseArgs_1.default)(application.argv, {
                'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
                'board': { short: 'b', arg: 'name', help: '要构建的板型' },
                'clean': { short: 'c', help: '构建前清除 (全新构建)' },
                'env': { arg: 'name', help: '指定当次编译有效的环境' },
                'task-help': { short: 'h', help: '打印帮助' },
            });
            if (args['task-help']) {
                return printHelp([
                    'app:build [options] [project-path]',
                ]);
            }
            const env = await (0, env_1.getEnv)(args['env']);
            if (!env['ZEPHYR_BASE']) {
                throw new Error(`需要设置 SDK (lisa zep use-sdk [path])`);
            }
            if (!(await (0, fs_extra_1.pathExists)(env['ZEPHYR_BASE']))) {
                throw new Error(`SDK 不存在: ${env['ZEPHYR_BASE']}`);
            }
            const westArgs = ['build'];
            const buildDir = (0, path_1.resolve)(args['build-dir'] ?? 'build');
            westArgs.push('--build-dir', buildDir);
            const board = args['board'] ?? await (0, cmake_1.getCMakeCache)(buildDir, 'CACHED_BOARD', 'STRING');
            if (!board) {
                throw new Error(`需要指定板型 (-b [board])`);
            }
            westArgs.push('--board', board);
            if (args['clean']) {
                await (0, fs_extra_1.remove)(buildDir);
            }
            const project = (0, ux_1.workspace)();
            if (project) {
                if (!(await (0, fs_extra_1.pathExists)(project))) {
                    throw new Error(`项目不存在: ${project}`);
                }
                westArgs.push(project);
            }
            const exec = (0, extendExec_1.default)(cmd, { task, env });
            await exec('python', ['-m', 'west', ...westArgs], {
                env: {
                    CMAKE_EXPORT_COMPILE_COMMANDS: '1',
                },
            });
            const appAddr = await getAppFlashAddr(buildDir);
            const appFile = (0, path_1.join)(buildDir, 'zephyr', 'zephyr.bin');
            (0, flash_1.appendFlashConfig)(ctx, 'app', appAddr, appFile);
            ctx.appBuilt = true;
        },
        options: {
            persistentOutput: true,
            bottomBar: 10,
        },
    });
    (0, lisa_ex_1.job)('app:flash', {
        title: '应用烧录',
        before: (ctx) => [
            application.tasks['app:build'],
        ],
        async task(ctx, task) {
            const { args, printHelp } = (0, parseArgs_1.default)(application.argv, {
                'env': { arg: 'name', help: '指定当次编译有效的环境' },
                'task-help': { short: 'h', help: '打印帮助' },
            });
            if (args['task-help']) {
                return printHelp();
            }
            const exec = (0, extendExec_1.default)(cmd, { task, env: await (0, env_1.getEnv)(args['env']) });
            const flashArgs = await (0, flash_1.getFlashArgs)(ctx, 'app');
            const flasher = await (0, env_1.getFlasher)(args['env']);
            if (flasher) {
                const { command, args: execArgs } = flasher.makeFlashExecArgs(flashArgs);
                await exec(command, execArgs);
            }
            else {
                await exec('python', ['-m', 'west', 'flash']);
            }
        },
    });
    (0, lisa_ex_1.job)('app:clean', {
        title: '应用清理',
        async task(ctx, task) {
            const { args, printHelp } = (0, parseArgs_1.default)(application.argv, {
                'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
                'task-help': { short: 'h', help: '打印帮助' },
            });
            if (args['task-help']) {
                return printHelp();
            }
            const buildDir = (0, path_1.resolve)(args['build-dir'] ?? 'build');
            await (0, fs_extra_1.remove)(buildDir);
        },
    });
};
