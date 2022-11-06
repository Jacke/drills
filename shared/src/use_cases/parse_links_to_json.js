import validUrl from 'valid-url';
import { jsonToString, writeFile } from '../utils.js';
import { notion } from '../api/notion/client.js';
import { isHeading2, isHeading3, isBookmark, isParagraph, } from '../types.js';
import { ROOT_PAGE, NESTED_PAGES } from '../pages.js';
export const parseLinks = async (pageId) => {
    let lastPageBlocks = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
    });
    let accBlocks = lastPageBlocks.results;
    while (lastPageBlocks.has_more) {
        lastPageBlocks = await notion.blocks.children.list({
            block_id: pageId,
            start_cursor: lastPageBlocks.next_cursor,
            page_size: 100,
        });
        accBlocks = accBlocks.concat(lastPageBlocks.results);
    }
    const blocks = accBlocks.flat();
    const urls = [];
    for (const b of blocks) {
        if (isHeading2(b)) {
            console.log('heading_2', b.heading_2.rich_text[0]?.plain_text);
        }
        if (isHeading3(b)) {
            console.log('heading_3', b.heading_3.rich_text[0]?.plain_text);
        }
        if (isBookmark(b)) {
            console.log('bookmark', b.bookmark.url);
            urls.push(b.bookmark.url);
        }
        if (isParagraph(b)) {
            console.log('paragraph', b.paragraph.rich_text[0]?.plain_text);
            if (validUrl.isUri(b.paragraph.rich_text[0]?.plain_text)) {
                urls.push(b.paragraph.rich_text[0]?.plain_text);
            }
        }
    }
    const data = urls.map((url) => {
        return {
            url: url,
        };
    });
    return data;
};
const saveLinksToJson = async (fileName, links) => {
    return await writeFile(`/Users/stan/Dev/_Side/@Drills/drilllist-server/data/${fileName}.json`, jsonToString(links));
};
export const parseNestedPages = async () => {
    await NESTED_PAGES.forEach(async (page) => {
        const links = await parseLinks(page.pageId);
        saveLinksToJson(page.name, links);
    });
};
export const extractPageIdsFromRootPage = async () => {
    const rootPageId = ROOT_PAGE[0].pageId;
    const pageObject = await notion.pages.retrieve({ page_id: rootPageId });
    let response = await notion.blocks.children.list({
        block_id: rootPageId,
        page_size: 100,
    });
    let accBlocks = response.results;
    while (response.has_more) {
        response = await notion.blocks.children.list({
            block_id: rootPageId,
            start_cursor: response.next_cursor,
            page_size: 100,
        });
        accBlocks = accBlocks.concat(response.results);
    }
    console.log(jsonToString(response));
};
