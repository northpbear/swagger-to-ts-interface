import { camelCase, isAllOptional } from './utils';
import type { Method, OperationMetadata } from './types';
export interface RequestParam {
    /** 类型名称 */
    typeName: string;
    required: boolean;
}
export interface API {
    path: string;
    name: string;
    method: Method;
    /** api 分类 */
    tags: string[];
    description: string;
    /** url 上参数对应的类型名称 */
    param?: string;
    query?: RequestParam;
    body?: RequestParam;
    /** 返回值类型名称 */
    response?: string;
}
export interface SchemaParserOptions {
    getPath: (patch: string) => string;
}
interface Components {
    [key: string]: {
        type: string;
        properties: {
            [key: string]: {
                type: string;
                format: string;
                description: string;
                enum: any;
                default: boolean;
            };
        };
        xml: any;
    };
}
interface Paths {}
export interface Docs {
    swagger: string;
    definitions: Components;
    paths: Paths;
}
export interface FieldRecord {
    field: string;
    type: string;
    required: boolean;
    nullable: boolean;
    description: string;
}
class SchemaParser {
    readonly _docs: Docs;
    readonly _options?: SchemaParserOptions;

    types: Record<string, any> = {};
    apis: API[] = [];

    constructor(docs: Docs, options?: SchemaParserOptions) {
        this._docs = docs;
        this._options = options;
    }
    /** 开始解析 */
    parse() {
        if (parseInt(this._docs.swagger) > 2) {
            throw new Error('目前只支持2.x版本的swagger');
        }
        this.createAllTypeData();
    }
    /** 创建 interface 字符串 */
    private createInterfaceString = (name: string, fields: FieldRecord[]) => {
        if(fields.length === 1 && fields[0].field === 'request'){
            return `
            export type ${name} = ${fields[0].type}
            `;
        }
        return `
       export interface ${name} {
         ${fields
             .map((_) => {
                 return `
       ${_.description ? `/** ${_.description} */` : ''}
       ${_.field}${!_.required ? '?' : ''}: ${_.type}${_.nullable ? ' | null' : ''};`;
             })
             .join('')}
       }
       `;
    };

    /** 创建 type 类型个别名字符串 */
    private createTypeAliasString(
        name: string,
        childTypes: (number | string)[],
        description?: string
    ) {
        return `
	 ${description ? `/** ${description} */` : ''}
	 export type ${name} = ${childTypes.map((_) => (typeof _ === 'number' ? _ : `${_}`)).join('|')};
	 `;
    }
    private createInterfaceStringFormObjectSchema(interfaceName: string, fieldRecord: any) {
        if (fieldRecord.properties) {
            this.types[interfaceName] = this.createInterfaceString(
                interfaceName,
                Object.entries(fieldRecord.properties).map((_: any) => {
                    let nullable = false;
                    let description = '';
                    if ('$ref' in _[1]) {
                        nullable = false;
                    }
                    if ('type' in _[1]) {
                        nullable = !!_[1].nullable;
                        description = _[1].description ?? '';
                    }
                    const typeName = this.createTypeNameFromSchema(interfaceName, _[0], _[1]);
                    return {
                        field: _[0],
                        type: typeName,
                        required: !!fieldRecord.required?.includes(_[0]),
                        nullable,
                        description,
                    };
                })
            );
        }
    }

    private createTypeNameFromSchema(interfaceName: string, fieldName: string, schema: any): any {
        fieldName = fieldName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
        if (schema && '$ref' in schema) {
            const data = schema.$ref.split('/');
            return data[data.length - 1].replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
        }
        if (schema && 'type' in schema) {
            switch (schema.type) {
                case 'boolean':
                    return 'boolean';
                case 'integer':
                case 'number': {
                    if (schema.enum) {
                        const nextInterfaceName = camelCase(`${interfaceName}-${fieldName}-union`);
                        this.types[nextInterfaceName] = this.createTypeAliasString(
                            nextInterfaceName,
                            schema.enum,
                            schema.description
                        );
                        return nextInterfaceName;
                    }
                    return 'number';
                }
                case 'string': {
                    if (schema.enum) {
                        const nextInterfaceName = camelCase(`${interfaceName}-${fieldName}-union`);
                        this.types[nextInterfaceName] = this.createTypeAliasString(
                            nextInterfaceName,
                            schema.enum.map((_: any) => `'${_}'`),
                            schema.description
                        );
                        return nextInterfaceName;
                    }
                    if (schema.format === 'date-time') {
                        return 'string';
                    }
                    return 'string';
                }
                case 'array':
                    if (!schema.items) {
                        return 'any[]'; // NOTE: 数组没有写明每一项的类型，则返回 any[]
                    }
                    const nextInterfaceName = camelCase(`${interfaceName}-${fieldName}-item`);
                    return `${this.createTypeNameFromSchema(
                        nextInterfaceName,
                        'item',
                        schema.items
                    )}[]`;
                case 'object':
                    if (schema.properties) {
                        const nextInterfaceName = camelCase(`${interfaceName}-${fieldName}`);
                        this.createInterfaceStringFormObjectSchema(nextInterfaceName, schema);
                        return nextInterfaceName;
                    }
                    // NOTE: 如果不存在 properties 则代表后端返回的数据是一个不固定的值
                    return 'object';
            }
        }
    }

    /** 将 api path 和 请求方式组合生成 api 名称 */
    private mapApiPathToApiName(apiPath: string) {
        const path = this._options?.getPath?.(apiPath) ?? apiPath;
        return path
            .split('/')
            .map((_) => (/{[\w]+}/.test(_) ? `By${camelCase(_.slice(1, -1))}` : camelCase(_)))
            .join('');
    }

    /** 解析 query 和 param 的类型 */
    private createQueryAndParamTypes(interfaceName: string, operationMetadata: OperationMetadata) {
        const query: FieldRecord[] = [];
        const param: FieldRecord[] = [];
        const body: FieldRecord[] = [];
        (operationMetadata.parameters??[])
            .filter((_) => _.in === 'path' || _.in === 'query' ||  _.in === 'body')
            .forEach((_) => {
                const nextInterfaceName = camelCase(`${interfaceName}-${_.in}`);
                const record: FieldRecord = {
                    field: _.name,
                    type: this.createTypeNameFromSchema(nextInterfaceName, _.name, _.schema || {type: _.type}),
                    required: _.required ?? false,
                    nullable: false,
                    description: _.description ?? '',
                };
                if (_.in === 'query') {
                    query.push(record);
                } else if (_.in === 'body') {
                    body.push(record);
                } else {
                    param.push(record);
                }
            });
        const queryTypeName = camelCase(`${interfaceName}-query`);
        const paramTypeName = camelCase(`${interfaceName}-param`);
        const bodyTypeName = camelCase(`${interfaceName}-body`);
        if (query.length > 0) {
            this.types[queryTypeName] = this.createInterfaceString(queryTypeName, query);
        }
        if (param.length > 0) {
            this.types[paramTypeName] = this.createInterfaceString(paramTypeName, param);
        }
        if (body.length > 0) {
            this.types[bodyTypeName] = this.createInterfaceString(bodyTypeName, body);
        }
    }
    /** 解析 body 类型 */
    private createBodyTypes(interfaceName: string, operationMetadata: OperationMetadata) {
        if (operationMetadata.requestBody) {
            const schema = (operationMetadata.requestBody as any)?.content?.['application/json']
                ?.schema;
            if (schema) {
                const typeName = this.createTypeNameFromSchema(interfaceName, 'body', schema);
                const bodyInterfaceName = camelCase(`${interfaceName}-body`);
                this.types[bodyInterfaceName] = this.createTypeAliasString(bodyInterfaceName, [
                    typeName,
                ]);
            }
        }
    }
    /** 解析 response 类型 */
    private createResponseTypes(interfaceName: string, operationMetadata: OperationMetadata) {
        const schema = operationMetadata.responses?.[200]?.content?.['application/json']?.schema;
        if (schema) {
            this.createTypeNameFromSchema(interfaceName, 'response', schema);
        }
    }
    /** 生成接口并添加到 this.APIList */
    private createAPIs(path: string, method: Method, operationMetadata: OperationMetadata) {
        const pathName = this.mapApiPathToApiName(path);
        const paramInterfaceName = camelCase(`${pathName}-${method}-param`);
        const queryInterfaceName = camelCase(`${pathName}-${method}-query`);
        const bodyInterfaceName = camelCase(`${pathName}-${method}-body`);
        const responseInterfaceName = (operationMetadata.responses?.['200']?.schema?.originalRef??'').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
        const apiListItem: API = {
            path,
            name: camelCase(`${pathName}-${method}`, false),
            method,
            /** api 分类 */
            tags: operationMetadata.tags,
            description: operationMetadata.summary,
            /** url 上参数对应的类型名称 */
            param: this.types[paramInterfaceName] && paramInterfaceName,
            query: this.types[queryInterfaceName]
                ? {
                      required: !isAllOptional(this.types[queryInterfaceName]!),
                      typeName: queryInterfaceName,
                  }
                : undefined,
            body: this.types[bodyInterfaceName]
                ? {
                      required: !isAllOptional(this.types[bodyInterfaceName]!),
                      typeName: bodyInterfaceName,
                  }
                : undefined,
            /** 返回值类型名称 */
            response: this.types[responseInterfaceName] && responseInterfaceName,
        };
        this.apis.push(apiListItem);
    }

    private createDefinitionsTypes(definitions: Docs['definitions']) {
        Object.entries(definitions).forEach(([key, schema]) => {
            this.createTypeNameFromSchema('', key, schema);
        });
        Object.entries(this._docs.paths).forEach(([path, operationMetadataMap]) => {
            Object.keys(operationMetadataMap).forEach((m) => {
                const method = m as Method;
                const interfaceName = camelCase(`${this.mapApiPathToApiName(path)}-${method}`);
                const operationMetadata = operationMetadataMap[method];
                this.createQueryAndParamTypes(interfaceName, operationMetadata);
                this.createBodyTypes(interfaceName, operationMetadata);
                this.createResponseTypes(interfaceName, operationMetadata);
                this.createAPIs(path, method, operationMetadata);
            });
        });
    }

    /** 创建所有的类型相关信息 */
    private createAllTypeData() {
        this.createDefinitionsTypes(this._docs.definitions);
    }
}

export default SchemaParser;
