"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_1 = require("./create");
const environment_1 = require("./environment");
const fs_1 = require("./fs");
const installation_1 = require("./installation");
const project_1 = require("./project");
exports.default = (core) => {
    (0, create_1.default)(core);
    (0, environment_1.default)(core);
    (0, fs_1.default)(core);
    (0, installation_1.default)(core);
    (0, project_1.default)(core);
};
