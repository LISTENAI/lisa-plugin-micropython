"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisa_ex_1 = require("../utils/lisa_ex");
const fs_extra_1 = require("fs-extra");
exports.default = ({ application, cmd }) => {
    (0, lisa_ex_1.job)('fs:calc', {
        title: '计算所需文件系统大小',
        async task(ctx, task) {
            if (!(0, fs_extra_1.pathExists)('CMakeLists.txt') ||
                !(0, fs_extra_1.pathExists)('boards') ||
                !(0, fs_extra_1.pathExists)('py')) {
                throw new Error('请在项目根目录下执行');
            }
            const stat = (0, fs_extra_1.statSync)('py');
            let size = stat.size;
            if (stat.size % 4096 != 0) {
                size += 4096 - (stat.size % 4096);
            }
            task.title = `所需大小至少为 ${size} bytes，在设备树文件（.overlay）中可对应替换为 0x${size.toString(16)}`;
        },
    });
};
