"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const util_1 = require("util");
const child_process_1 = require("child_process");
const config_1 = require("./env/config");
const execFile = (0, util_1.promisify)(child_process_1.execFile);
const HOME = (0, path_1.join)(config_1.PLUGIN_HOME, 'venv');
exports.default = {
    homeDir: HOME,
    binaryDir: (0, path_1.join)(HOME, process.platform == 'win32' ? 'Scripts' : 'bin'),
    env: {
        VIRTUAL_ENV: HOME,
    },
    async version() {
        const { stdout } = await execFile((0, path_1.join)(this.binaryDir, 'python'), [
            '--version',
        ]);
        return stdout.split('\n')[0].trim();
    },
};
