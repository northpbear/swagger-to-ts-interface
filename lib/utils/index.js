"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFromString = void 0;
const requireFromString = (src, filename = "") => {
    const Module = module.constructor;
    const m = new Module();
    m._compile(src, filename);
    return m.exports;
};
exports.requireFromString = requireFromString;
//# sourceMappingURL=index.js.map