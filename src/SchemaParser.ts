export interface SchemaParserOptions {
  getPath: (patch: string) => string;
}
interface Components {}
interface Paths {}
export interface Docs {
  openapi: string;
  components: Components;
  paths: Paths;
}
class SchemaParser {
  readonly _docs: Docs;
  readonly _options?: SchemaParserOptions;
  constructor(docs: Docs, options?: SchemaParserOptions) {
    this._docs = docs;
    this._options = options;
  }
  /** 开始解析 */
  parse() {
    if (parseInt(this._docs.openapi) > 2) {
      throw new Error("目前只支持2.x版本的swagger");
    }
    this.createAllTypeData();
  }

  /** 创建所有的类型相关信息 */
  private createAllTypeData() {}
}

export default SchemaParser;
