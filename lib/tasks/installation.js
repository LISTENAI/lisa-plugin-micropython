"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisa_ex_1 = require("../utils/lisa_ex");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const extendExec_1 = require("../utils/extendExec");
const env_1 = require("../env");
const config_1 = require("../env/config");
const python_3_9_1 = require("@binary/python-3.9");
const venv_1 = require("../venv");
exports.default = ({ cmd }) => {
    (0, lisa_ex_1.job)('install', {
        title: '环境安装',
        async task(ctx, task) {
            const exec = (0, extendExec_1.default)(cmd, { task });
            await (0, fs_extra_1.mkdirs)(config_1.PLUGIN_HOME);
            await (0, env_1.invalidateEnv)();
            await exec((0, path_1.join)(python_3_9_1.default.binaryDir, 'python'), [
                '-m',
                'venv',
                venv_1.default.homeDir,
                '--upgrade-deps',
            ]);
            await exec('python', ['-m', 'pip', 'install', 'mpremote'], {
                env: await (0, env_1.getEnv)(),
            });
            await (0, env_1.invalidateEnv)();
        },
    });
    (0, lisa_ex_1.job)('uninstall', {
        title: '环境卸载',
        async task(ctx, task) {
            await (0, fs_extra_1.remove)(config_1.PLUGIN_HOME);
        },
    });
};
