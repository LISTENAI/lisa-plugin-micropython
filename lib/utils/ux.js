"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptDir = exports.workspace = void 0;
const lisa_core_1 = require("@listenai/lisa_core");
const path_1 = require("path");
function workspace() {
    const { application } = lisa_core_1.default;
    const argv = application.argv;
    return argv._[1] ? (0, path_1.resolve)(argv._[1]) : undefined;
}
exports.workspace = workspace;
async function promptDir(selected, dirJson, task) {
    const choices = Object.keys(dirJson).map((dir) => {
        return typeof dirJson[dir] !== 'string' ? `${dir}/` : dir;
    });
    const value = await task.prompt([
        {
            type: 'Select',
            name: 'value',
            message: 'Please select dir. (Arrow keys to select and enter key to confirm.)',
            choices: choices,
            result: (value) => value.replace('/', ''),
        },
    ]);
    selected.push(value);
    if (typeof dirJson[value] === 'string') {
        return selected;
    }
    return await promptDir(selected, dirJson[value], task);
}
exports.promptDir = promptDir;
