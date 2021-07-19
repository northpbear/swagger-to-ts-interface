import * as path from "path";
import * as fs from "fs-extra";
import { requireFromString } from "./utils";
import requestDocUrl from "./requestDocUrl";
import SchemaParser from "./SchemaParser";
import type { Docs } from "./SchemaParser";

export interface Options {
  docUrl: string;
  outputDir: string;
  getPath: (path: string) => string;
  requestFrom: string;
  gzip?: boolean;
}

const cwd = process.cwd();

//动态加载配置文件
const options: Options = requireFromString(
  fs
    .readFileSync(path.resolve(cwd, "swagger-to-ts-interface.config.js"))
    .toString()
);

console.log("options", options);

// const outputDir = path.resolve(cwd, options.outputDir);

const run = async () => {
  const docsJson = await requestDocUrl(options.docUrl, options.gzip ?? false);
  console.log("docs", docsJson);
  const schema = JSON.parse(docsJson);
  console.log("schema", schema);

  const parser = new SchemaParser(schema as any as Docs, {
    getPath: options.getPath,
  });
  parser.parse();
};

run();
