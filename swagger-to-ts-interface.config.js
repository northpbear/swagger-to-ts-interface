const config = {
  docUrl: 'https://petstore.swagger.io/v2/swagger.json',
  outputDir: 'api',
  getPath: (path) => path,
  requestFrom: 'import { request } from "src/utils/request";',
  gzip: false,
};

module.exports = config;
