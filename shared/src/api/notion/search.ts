import { notion } from './client.js';
import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { ROOT_PAGE, NESTED_PAGES } from '../../pages.js';

export const searchQuery = async (
  query: string,
  kind?: 'page' | 'database',
) => {
  const filter:
    | {
        property: 'object';
        value: 'page' | 'database';
      }
    | undefined = kind
    ? {
        value: kind,
        property: 'object',
      }
    : undefined;

  await notion.search({
    query: query,
    sort: {
      direction: 'ascending',
      timestamp: 'last_edited_time',
    },
    filter: filter,
  });


  const rootPageId = ROOT_PAGE[0].pageId;
  const pageObject = await notion.pages.retrieve({ page_id: rootPageId });
  let response = await notion.blocks.children.list({
    block_id: rootPageId,
    page_size: 100,
  });
  let accBlocks: Array<GetBlockResponse> = response.results;
  while (response.has_more) {
    response = await notion.blocks.children.list({
      block_id: rootPageId,
      start_cursor: response.next_cursor,
      page_size: 100,
    });
    accBlocks = accBlocks.concat(response.results);
  }

};
