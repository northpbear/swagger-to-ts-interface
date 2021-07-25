import * as path from 'path';
import * as fs from 'fs-extra';
import groupby from 'lodash.groupby';
import { requireFromString, formatCode } from './utils';
import requestDocUrl from './requestDocUrl';
import SchemaParser from './SchemaParser';
import type { Docs, API } from './SchemaParser';

const N = "\n";
export interface Options {
  docUrl: string;
  outputDir: string;
  getPath: (path: string) => string;
  requestFrom: string;
  gzip?: boolean;
}

const cwd = process.cwd();

//动态加载配置文件
const options: Options = requireFromString(fs.readFileSync(path.resolve(cwd, 'swagger-to-ts-interface.config.js')).toString());

console.log('options', options);

const outputDir = path.resolve(cwd, options.outputDir);

/** 写入所有的 api,字段的类型 */
const createAPIType = (types: Record<string, string | undefined>) => {
  const mainCode = Object.values(types).join('\n');
  const code = `
	${mainCode}
	`;
  fs.writeFileSync(path.resolve(cwd, outputDir, 'types.ts'), formatCode(code));
  const contextSourcePath = path.resolve(cwd, 'templates/context.ts');
  const contextOutputPath = path.resolve(cwd, outputDir, 'context.ts');
  fs.copyFile(contextSourcePath, contextOutputPath, (err) => { 
    if (err) { 
      console.log("Error Found:", err);
    } 
    else {
        console.log(`copy context.ts from ${contextSourcePath} to ${contextOutputPath}`);
    } 
  }); 
};
/** 生成并写入所有的 api 调用方法寄文件 */
const createAPIService = (apis: API[]) => {
//   const ajaxString = options.requestFrom.match(/{([\w\s]+)}/)![1].trim();
  Object.entries(groupby(apis, (item) => item.path)).forEach(([_path, apis]) => {
    // 该分类的接口所有用到的类型
    let requestTypes: (string | undefined)[] = [];
    // 所有接口字符串
    let apisStringArray: string[] = [];
    let exportDefaultStringArray: string[] = [];
    let RequestResponseFlag = false;
    apis.forEach((api) => {
      console.log('api::', api);
      const paramString = api.param ? `segments: ${api.param}` : '';
      const queryString = api.query ? `params${api.query.required ? '' : '?'}: ${api.query.typeName}` : '';
      const bodyString = api.body ? `data${api.body.required ? '' : '?'}: ${api.body.typeName}` : '';
      if(!api.response){
        RequestResponseFlag = true;
      }
      const responseType = api.response ? `Promise<${api.response}>` : 'Promise<RequestResponse<void>>';

      requestTypes.push(...[api.query?.typeName, api.param, api.body?.typeName, api.response].filter(Boolean));
      const fnParamsString = [paramString, queryString, bodyString].filter(Boolean).join(',');
      const argumentArray = [`${api.param ? 'segments' : ''}`, `${api.query ? 'params' : ''}`, `${api.body ? 'data' : ''}`]
      const fnParamsStringWithType = argumentArray.filter(Boolean).length ? `{${argumentArray.filter(Boolean).join(', ')}} : {${[paramString, queryString, bodyString].filter(Boolean).join('; ')}}` : ''
      const fnParamsArray = fnParamsString.match(/\b(params|data|segments)(?=(\??:))/g);
      const defaultDescription = '[' + api.method.toUpperCase() + '] ' + api.path;
      let apisStringItem = `/**${
        N} * ${api.description || defaultDescription}${
        N} *${
        N} * @export${
        N} * @tags ${api.tags.join(', ')}${
        N} * @link ${defaultDescription}`;
      let pathParamReg = new RegExp(/\{(.*?)\}/g);
      let temp;
      while ((temp = pathParamReg.exec(api.path))) {
        apisStringItem += `${N} * @param ${temp[1]}`;
      }
      apisStringArray.push(`
        ${apisStringItem}${
        N}*/${
        N}export const ${api.name} = (${fnParamsStringWithType}): ${responseType} => request('${api.path}', { method: '${api.method}', ${fnParamsArray ? fnParamsArray.join(',') : ''} });
	    `);
      exportDefaultStringArray.push(`${api.method}: ${api.name},`);
    });
    const outputPath = _path.startsWith('/') ? _path.substr(1) : _path;
    const relativePath = '../'.repeat(outputPath.split('/').length);
    const code = `
        ${options.requestFrom}${RequestResponseFlag ? `${N}import {RequestResponse} from 'umi-request';` : ''}
        ${`import { request } from "${relativePath}context";`}
        ${requestTypes.length > 0 ? `import type { ${requestTypes.join(',')} } from "${relativePath}types";` : ''}
   
        ${apisStringArray.join(N)}
        export default {${
          N}${exportDefaultStringArray.join(N)}${
          N}};
        `;
    fs.ensureDirSync(path.resolve(cwd, outputDir, `${outputPath}`));
    fs.writeFileSync(path.resolve(cwd, outputDir, `${outputPath}/index.ts`), formatCode(code));
    requestTypes = [];
    apisStringArray = [];
  });
};

const run = async () => {
  const docsJson = await requestDocUrl(options.docUrl, options.gzip ?? false);
  const schema = JSON.parse(docsJson);

  const parser = new SchemaParser(schema as any as Docs, {
    getPath: options.getPath,
  });
  parser.parse();
  fs.ensureDir(outputDir);
  createAPIType(parser.types);
  createAPIService(parser.apis);
};

run();
