"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisa_ex_1 = require("../utils/lisa_ex");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const template_1 = require("../utils/template");
exports.default = ({ application, cmd }) => {
    (0, lisa_ex_1.job)('create', {
        title: '创建项目',
        async task(ctx, task) {
            const fileSystemSize = await task.prompt({
                type: 'Input',
                message: '文件系统大小 (KB)',
                initial: '512',
            });
            const targetDir = await task.prompt({
                type: 'Input',
                message: '创建文件夹名',
            });
            (0, fs_extra_1.mkdirs)(targetDir);
            await (0, fs_extra_1.copy)((0, path_1.join)(__dirname, '../../template'), targetDir);
            // 项目名
            (0, template_1.replaceWord)((0, path_1.join)(targetDir, 'CMakeLists.txt'), '{{PROJECT_NAME}}', targetDir);
            const fsSizeKb = parseInt(fileSystemSize, 10);
            (0, template_1.replaceWord)((0, path_1.join)(targetDir, 'boards', 'csk6001_pico.overlay'), '{{FILESYSTEM_SIZE}}', `0x${(fsSizeKb * 1024).toString(16)}`);
        },
    });
};
