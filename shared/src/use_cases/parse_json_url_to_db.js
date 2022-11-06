/* eslint-disable prettier/prettier */
import urlMetadata from 'url-metadata';
import validUrl from 'valid-url';
import { writeFile, readDir, readFile, jsonToString } from '../utils.js';
import { notion } from '../api/notion/client.js';
;
import { isMetaResult } from '../types.js';
export const loadLinksFromRoot = async () => {
    const rawdata = await readFile(`/Users/stan/Dev/_Side/@Drills/drilllist-server/data/reading_list_dbs.json`);
    const linksPerDb = JSON.parse(rawdata.toString());
    for (const db of linksPerDb) {
        const rawLinkData = await readFile(`/Users/stan/Dev/_Side/@Drills/drilllist-server/data/reading_list/${db.title}.json`);
        const linkData = JSON.parse(rawLinkData.toString());
        console.log(db.title, linkData.length);
        const parsedLinks = await Promise.all(parseJsonLinksByUrl(linkData));
        await appendJsonLinksToDatabase(db.id, parsedLinks);
    }
};
const parseJsonLinks = async (title) => {
    const rawdata = await readFile(`/Users/stan/Dev/_Side/@Drills/drilllist-server/data/${title}.json`);
    const urls = JSON.parse(rawdata.toString()).map((url) => {
        if (validUrl.isUri(url.url)) {
            return urlMetadata(url.url)
                .catch((err) => {
                console.error(url.url, err);
                return new Error(`Error getting metadata for ${url}`);
            })
                .then((metaData) => {
                if (isMetaResult(metaData) && metaData.title != null) {
                    return { url: url.url, title: metaData.title };
                }
                else {
                    // console.log('title not defined', url.url);
                    return { url: url.url, title: '' }; // TODO: Error handling
                }
            });
        }
        else {
            console.log('url not valid', url.url);
            return null; // TODO: Error handling
        }
    }).filter(Boolean);
    return urls;
};
const parseJsonLinksByUrl = (linkData) => {
    const urls = linkData.map((url) => {
        if (validUrl.isUri(url.url)) {
            return urlMetadata(url.url)
                .catch((err) => {
                console.error(url.url, err);
                return new Error(`Error getting metadata for ${url}`);
            })
                .then((metaData) => {
                if (isMetaResult(metaData) && metaData.title != null) {
                    return { url: url.url, title: metaData.title };
                }
                else {
                    // console.log('title not defined', url.url);
                    return { url: url.url, title: '' }; // TODO: Error handling
                }
            });
        }
        else {
            console.log('url not valid', url.url);
            return null; // TODO: Error handling
        }
    }).filter(Boolean);
    return urls;
};
const appendJsonLinksToDatabase = async (databaseId, links) => {
    /*
    const readQuery = await notion.databases.query({
      database_id: databaseId,
    });
    */
    // console.log(jsonToString(readQuery));
    await links.forEach(async (link) => {
        console.log(link);
        if (link !== null && link.title != undefined) {
            console.log('create link', link.url);
            await notion.pages.create({
                parent: {
                    database_id: databaseId,
                },
                properties: {
                    Title: {
                        type: 'title',
                        title: [
                            {
                                type: 'text',
                                text: {
                                    content: link.title,
                                },
                            },
                        ],
                    },
                    URL: {
                        url: link.url,
                    },
                },
            });
        }
        else {
            // console.log(link);
        }
    });
};
export const parseJsonLinkTitles = async (path) => await readDir(path).then((titles) => titles.map((t) => t.replace('.json', '')));
const delay = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
};
export const parseJsonLinksCreateDatabases = async (parentId) => {
    // const links = await parseJsonLinks(title);
    // const linksResolved = await Promise.all(links);
    // console.log('linkResolved', linksResolved)
    const dirs = await parseJsonLinkTitles('/Users/stan/Dev/_Side/@Drills/drilllist-server/data/reading_list');
    console.log(dirs);
    const databasePerPage = [];
    for (const pageTitle of dirs) {
        try {
            const response = await createDatabase(parentId, pageTitle);
            databasePerPage.push({
                title: pageTitle,
                id: response.id,
            });
        }
        catch (e) {
            console.log('e', e, pageTitle);
        }
    }
    if (databasePerPage.length > 0) {
        await writeFile(`/Users/stan/Dev/_Side/@Drills/drilllist-server/data/reading_list_dbs.json`, jsonToString(databasePerPage));
    }
    //await appendJsonLinksToDatabase(databaseId, linksResolved.filter(Boolean));
};
const readingListProps = () => {
    return {
        Title: { title: {} },
        URL: { url: {} },
    };
};
const createDatabase = async (parentId, title) => {
    console.log('createDb', title);
    return await notion.databases.create({
        parent: { page_id: parentId },
        properties: readingListProps(),
        title: [
            {
                type: 'text',
                text: {
                    content: title,
                    link: null
                }
            }
        ],
    });
};
