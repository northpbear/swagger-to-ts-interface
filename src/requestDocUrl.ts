const request = require("request");

const requestDocUrl = async (docUrl: string, isGzip: boolean) => {
  let promise = new Promise((resolve, reject) => {
    request(
      { method: "GET", uri: docUrl, gzip: isGzip },
      function (e: any, r: any, body: any) {
        if (e) {
          reject(e);
        }
        resolve(body);
      }
    );
  });
  const result = await promise;
  return result as string;
};

export default requestDocUrl;
