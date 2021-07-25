# Swagger TypeScript 类型生成

> 目前只支持 swagger2.x

## 配置

根目录创建 `swagger-ts-define.config.js`，进行配置

```javascript
const config = {
  /** swagger json schema 地址 */
  docUrl: 'http://example/docs-json',
  /** 类型输出目录，路径相对于根目录 */
  outputDir: 'api',
  /**
   * 对 api url 进行处理，该名称将会作为 interface 的名称前缀
   * @example /web/v1/user/list -> user/list -> interface UserListGetQuery {...}
   */
  getPath: (path) => path.match(/(?<=\/v1\/).+/)[0],
  /** api 调用方法方法来源，将会插入到文件首部 */
  requestFrom: 'import { request } from "src/utils/request";',
  gizp: true,
};

module.exports = config;
```

## 运行

```sh
# 在脚本所在目录下执行
yarn build
# 在项目根目录执行
node ../swagger-to-ts-interface/lib/index.js
```
