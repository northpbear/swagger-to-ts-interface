import umiRequest from 'umi-request';

export function request(options) {
    const {segments, ...umiRequestOptions} = options;
    let parsedPath = umiRequestOptions.url;
    let reg1 = new RegExp(/{(.*?)}/g);
    let matchedObj;
    while(matchedObj = reg1.exec(umiRequestOptions.url)){
      let reg = new RegExp(matchedObj[0], 'g');
      parsedPath = parsedPath.replace(reg, segments[matchedObj[1]]);
    }
    return umiRequest(umiRequestOptions);
};
