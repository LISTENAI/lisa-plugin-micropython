"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoStatus = void 0;
const simple_git_1 = require("simple-git");
async function rev(git) {
    let commit, branch;
    try {
        commit = (await git.revparse(['--short', 'HEAD'])).trim();
    }
    catch (e) {
        return null; // not a git repository
    }
    try {
        branch = (await git.raw(['symbolic-ref', '--short', 'HEAD'])).trim();
        return branch;
    }
    catch (e) {
        return commit; // detached
    }
}
async function clean(git) {
    const status = await git.status(['--porcelain']);
    return status.isClean();
}
async function getRepoStatus(path) {
    const git = (0, simple_git_1.default)(path);
    const branch = await rev(git);
    if (!branch) {
        return null;
    }
    const isClean = await clean(git);
    return isClean ? branch : `${branch}*`;
}
exports.getRepoStatus = getRepoStatus;
