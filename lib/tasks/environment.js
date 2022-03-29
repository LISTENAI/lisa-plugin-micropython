"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisa_ex_1 = require("../utils/lisa_ex");
const path_1 = require("path");
const config_1 = require("../env/config");
const parseArgs_1 = require("../utils/parseArgs");
const extendExec_1 = require("../utils/extendExec");
const simple_git_1 = require("simple-git");
const defaultGitRepo = 'git@git.iflyos.cn:venus/zephyr/micropython/lv_micropython.git';
exports.default = ({ application, cmd }) => {
    (0, lisa_ex_1.job)('use-sdk', {
        title: 'SDK 设置',
        after: (ctx) => [application.tasks['install']],
        async task(ctx, task) {
            task.title = '';
            const exec = (0, extendExec_1.default)(cmd, { task });
            const argv = application.argv;
            const path = argv._[1];
            const current = await (0, config_1.get)('sdk');
            const target = path || current;
            const { args, printHelp } = (0, parseArgs_1.default)(application.argv, {
                'from-git': { arg: 'url#ref', help: '从指定仓库及分支初始化 SDK' },
                'task-help': { short: 'h', help: '打印帮助' },
            });
            let gitRepo = defaultGitRepo;
            if (args['from-git']) {
                gitRepo = args['from-git'];
            }
            if (!path) {
                throw new Error(`SDK 路径是必传参数`);
            }
            // await exec('git', ['clone', gitRepo, path, '--recursive']);
            const errors = (error, result) => {
                if (error instanceof Error) {
                    throw error;
                }
                else if (error instanceof Buffer) {
                    throw new Error(error.toString());
                }
                if (result.exitCode == 0)
                    return error;
                throw new Error(result.stdErr.toString());
            };
            const progress = (event) => {
                task.output = `安装 SDK: ${event.stage} ${event.processed}/${event.total} ${event.progress}%`;
            };
            const gitOptions = { progress, errors };
            await (0, simple_git_1.default)(gitOptions).clone(gitRepo, path, [
                '-b',
                'listenai-simpilify',
                '--depth=1',
            ]);
            await exec('git', ['submodule', 'update', '--init', '--recursive', '--depth=1'], {
                cwd: (0, path_1.join)(process.cwd(), path),
            });
            await (0, config_1.set)('sdk', (0, path_1.join)(process.cwd(), path));
            task.title = 'SDK 设置成功';
        },
    });
};
