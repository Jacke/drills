import * as fs from 'fs';
import * as util from 'util';
import normalizeUrl from 'normalize-url';
export const readFile = util.promisify(fs.readFile);
export const readDir = util.promisify(fs.readdir);
export const writeFile = util.promisify(fs.writeFile);
export const cleanupUrl = (url) => {
    return normalizeUrl(url);
};
export const jsonToString = (json) => JSON.stringify(json, null, 2);
