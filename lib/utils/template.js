"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceWord = void 0;
const fs_1 = require("fs");
async function replaceWord(filePath, oldWord, newWord) {
    const content = (0, fs_1.readFileSync)(filePath).toString('utf-8');
    const newContent = content.replace(oldWord, newWord);
    (0, fs_1.writeFileSync)(filePath, newContent);
}
exports.replaceWord = replaceWord;
