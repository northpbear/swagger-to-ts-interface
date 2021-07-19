"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const request = require("request");
const requestDocUrl = (docUrl, isGzip) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    let promise = new Promise((resolve, reject) => {
        request({ method: "GET", uri: docUrl, gzip: isGzip }, function (e, r, body) {
            if (e) {
                reject(e);
            }
            resolve(body);
        });
    });
    const result = yield promise;
    return result;
});
exports.default = requestDocUrl;
//# sourceMappingURL=requestDocUrl.js.map