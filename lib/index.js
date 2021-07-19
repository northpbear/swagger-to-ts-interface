"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs-extra"));
const utils_1 = require("./utils");
const requestDocUrl_1 = tslib_1.__importDefault(require("./requestDocUrl"));
const cwd = process.cwd();
//动态加载配置文件
const options = utils_1.requireFromString(fs
    .readFileSync(path.resolve(cwd, "swagger-to-ts-interface.config.js"))
    .toString());
console.log("options", options);
// const outputDir = path.resolve(cwd, options.outputDir);
const run = () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const docsJson = yield requestDocUrl_1.default(options.docUrl, (_a = options.gzip) !== null && _a !== void 0 ? _a : false);
    console.log('docs', docsJson);
    const schema = JSON.parse(docsJson);
    console.log('schema', schema);
    //   const parser = new SchemaParser(docs as unknown as Docs, {
    //     getPath: options.getPath,
    //     isoStringTypeName: options.isoString.typeName,
    //   });
    //   parser.parse();
    //   fs.ensureDir(outputDir);
    //   createAPIType(parser.types);
    //   createAPIService(parser.apis);
});
run();
//# sourceMappingURL=index.js.map