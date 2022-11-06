/* eslint-disable prettier/prettier */
import {
  QueryDatabaseResponse,
  PageObjectResponse,
  BlockObjectResponse,
  GetPagePropertyResponse,
  PropertyItemPropertyItemListResponse,
  UrlPropertyItemObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js';
import urlMetadata from 'url-metadata';
import * as urlMetadataType from 'url-metadata';
import validUrl from 'valid-url';
import { notion } from '../api/notion/client.js';
import _ from 'lodash';
import rdash from 'radash';

import { logger } from '../main.js';
import { cleanupUrl, jsonToString } from '../utils.js';
import chalk from 'chalk';

export const fetchNestedPages = async (pageId: string): Promise<Array<any>> => {
  const [err, pageObject] = await rdash.try(notion.pages.retrieve)({ page_id: pageId });
  let blocks = [];
  let lastPageBlocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });
  blocks = blocks.concat(
    lastPageBlocks.results.filter(
      (v): v is BlockObjectResponse =>
        (v as BlockObjectResponse).last_edited_time !== undefined,
    ) as never[],
  );
  while (lastPageBlocks.has_more) {
    lastPageBlocks = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: lastPageBlocks.next_cursor as any,
      page_size: 100,
    });
    blocks = blocks.concat(
      lastPageBlocks.results.filter(
        (v): v is BlockObjectResponse =>
          (v as BlockObjectResponse).last_edited_time !== undefined,
      ) as never[],
    );
  }
  logger.info('blocks ' + jsonToString(blocks));
  return blocks.flat();
};

export const fetchLinksAndRemoveDuplicates = async (databaseId: string) => {
  const duplicates = await fetchDuplicates(databaseId);
  if (duplicates?.length === 0) {
    logger.error('No data for duplicates');
  } else {
    await Promise.all<any>(
      duplicates.map(async (entity) => await deleteBlock(entity.id)),
    );
  }
};

export const fetchLinksCheckAndWriteDB = async (databaseId: string) => {
  const emptyTitles = await fetchEmptyTitles(databaseId);
  if (emptyTitles?.length === 0) {
    logger.error('No data for emptyTitles');
  }
};

export const fetchLinksNormalized = async (databaseId: string) => {
  const normalizedURLS = await fetchNormalizedURLs(databaseId);
  if (normalizedURLS?.length === 0) {
    logger.error('No data for normalizedURLS');
  } else {
    console.log('normalizedURLS Result', normalizedURLS);
    await Promise.all<any>(
      normalizedURLS.map(
        async (entity) => {
          if (entity) {
            await updateResourceURL(entity.entity.id, entity.normalizedUrl)
          }
        }
      ),
    );
  }
};

const dbIterator = async (databaseId: string) => {
  let accBlocks: PageObjectResponse[] = [];
  let lastPageBlocks = await notion.databases.query({
    database_id: databaseId,
    page_size: 100,
  });
  accBlocks = accBlocks.concat(
    lastPageBlocks.results.filter(
      (v): v is PageObjectResponse =>
        (v as PageObjectResponse).url !== undefined,
    ) as never[]
  );
  //    .filter<PageObjectResponse>((obj): is PageObjectResponse => isFullPage(obj)));
  while (lastPageBlocks.has_more) {
    lastPageBlocks = await notion.databases.query({
      database_id: databaseId,
      start_cursor: lastPageBlocks.next_cursor as any,
      page_size: 100,
    });
    const filteredBlocks = lastPageBlocks.results.filter(
      (v): v is PageObjectResponse =>
        (v as PageObjectResponse).url !== undefined,
    );
    accBlocks = accBlocks.concat(filteredBlocks as never[]);
  }
  const blocks: PageObjectResponse[] = accBlocks.flat();
  return blocks;
};

export const fetchDatabaseEntities = async (databaseId: string) => {
  const entities = await dbIterator(databaseId);
  console.log('entities count ', entities.length);
  return entities;
};

interface EntityURL {
  entity: PageObjectResponse;
  normalizedUrl: string;
}
export const fetchNormalizedURLs = async (databaseId: string) => {
  const entities = await dbIterator(databaseId);
  if (entities.length > 0) {
    const normalizedURLs: (EntityURL | null)[] = await Promise.all(
      entities.map(async (entity): Promise<EntityURL | null> => {
        const dbPageId = entity.id;
        const a: PageObjectResponse = entity;
        if (entity.object == 'page' && a.properties.URL != undefined) {
          const fetchedProp: GetPagePropertyResponse = await retrieveProps(
            dbPageId,
            entity.properties.URL.id,
          ); // GetPagePropertyResponse
          const URLProp: UrlPropertyItemObjectResponse = fetchedProp as any;
          if (URLProp && URLProp.url) {
            const normalizedUrl = cleanupUrl(URLProp.url);
            if (!isURLPropNormalized(URLProp.url, normalizedUrl)) {
              console.log(
                chalk.blue('URLProp checked not normalized'),
                URLProp.url,
                normalizedUrl,
              );
              return { entity, normalizedUrl };
            } else {
              return null;
            }
          } else {
            return null;
          }
        } else {
          return null;
        }
      }),
    );
    console.log(
      'calculated normalizedURLs length: ',
      normalizedURLs.filter(Boolean).length,
    );
    return normalizedURLs.filter(Boolean);
  } else {
    return [];
  }
};

export const fetchEmptyTitles = async (databaseId: string) => {
  const entities = await dbIterator(databaseId);
  if (entities.length > 0) {
    const emptyTitles: any[] = await Promise.all(
      entities.map(async (entity): Promise<any> => {
        const dbPageId = entity.id;
        const a: any = entity;
        if (entity.object == 'page' && a.properties.Title != undefined) {
          const titleProp = (await retrieveProps(
            dbPageId,
            a.properties.Title.id,
          )) as any;
          if (
            titleProp.results.length == 0 ||
            titleProp.results[0].title?.text?.content == ''
          ) {
            logger.info('empty titleProp', jsonToString(titleProp));
          }
          if (isTitlePropEmpty(titleProp)) {
            logger.info(
              'titleProp checked',
              jsonToString(titleProp),
              titleProp.type,
            );
            return entity;
          } else {
            return null;
          }
        } else {
          return null;
        }
      }),
    );
    logger.info('calculated emptyTitles', emptyTitles);
    return emptyTitles.filter(Boolean);
  } else {
    return [];
  }
};

interface URLEntity {
  id: string;
  url: string;
}

const isUrlExists = (db: URLEntity[], targetUrl: string): boolean => {
  const result = db.find((url) => url.url == targetUrl);
  if (result !== undefined) {
    console.log('isUrlExists', db.length, targetUrl, result);
  }
  return result !== undefined; //_.filter(db, (url, i, iteratee) => _.includes(iteratee, url, i + 1))
};

const recordUrl = (db: URLEntity[], url: string, id: string) => {
  return db.push({
    url: url,
    id: id,
  });
};

const fetchDuplicates = async (databaseId: string) => {
  const entities = await dbIterator(databaseId);
  if (entities.length > 0) {
    const urlsPerIds = [];
    const duplicates: any[] = await Promise.all(
      entities.map(async (entity): Promise<any> => {
        const dbPageId = entity.id;
        const a: any = entity;
        if (entity.object == 'page' && a.properties.URL != undefined) {
          const urlProp = (await retrieveProps(
            dbPageId,
            a.properties.URL.id,
          )) as any;
          if (isUrlExists(urlsPerIds, urlProp.url)) {
            logger.info(
              'url duplicate has found: ' + jsonToString(urlProp),
            );
            return entity;
          } else {
            recordUrl(urlsPerIds, urlProp.url, dbPageId);
            // console.log('urlsPerIds', urlsPerIds.length);
            return null;
          }
        } else {
          return null;
        }
      }),
    );
    logger.info('urlsPerIds ' + urlsPerIds.length);
    logger.info('calculated duplicates ' + duplicates.length);
    const dups = _.filter(
      urlsPerIds.map((el) => (el as any).url),
      (url, i, iteratee) => _.includes(iteratee, url, i + 1),
    );
    console.log('dups', dups);
    return duplicates.filter(Boolean);
  } else {
    return [];
  }
};

const fetchLinksAndWriteDB = async (entity): Promise<unknown> => {
  const urlProp = await retrieveProps(entity.id, entity.properties.URL.id);
  const url = urlProp.type === 'url' ? urlProp.url : null;
  return await appendTitleByURL(url, entity.id);
};

const isTitlePropEmpty = (titleProp): boolean =>
  titleProp.results.length == 0 ||
  titleProp.results[0].title?.text?.content == '' ||
  titleProp.results[0].title?.text?.content == ' ';

const isURLPropNormalized = (urlProp, normalizedUrl): boolean =>
  urlProp === normalizedUrl;

const isMetaResult = (arg: any): arg is urlMetadataType.Result => {
  return arg.url !== undefined;
};

/**
 * Append URL title to specified database's page
 * @param uri URL
 * @param databasePageId Id of DB Page
 * @returns void
 */
const appendTitleByURL = async (uri: string | null, databasePageId: string) => {
  if (uri && validUrl.isUri(uri)) {
    const metaData = await metaDataParse(uri);
    if (isMetaResult(metaData) && metaData.title != null) {
      logger.info('databaseObject meta: ', metaData.title);
      await updateResourceTitle(databasePageId, metaData.title);
    }
  } else {
    return Promise.reject(new Error(`Error getting url: ${uri}`));
  }
};

const metaDataParse = async (
  uri: string,
): Promise<urlMetadataType.Result | Error> => {
  return urlMetadata(uri).catch((err: any) => {
    logger.error('Error for URL: ', uri, err);
    return new Error(`Error getting metadata for ${uri}`);
  });
};

const retrieveProps = (pageId: string, propId: string) => {
  return notion.pages.properties.retrieve({
    page_id: pageId,
    property_id: propId,
  });
};

const resetResourceTitle = async (pageId: string) =>
  await updateResourceTitle(pageId, '');

export const updateResourceURL = async (pageId: string, url: string) => {
  const urlProperty = url == '' ? '' : url;
  return notion.pages.update({
    page_id: pageId,
    properties: {
      URL: {
        type: 'url',
        url: urlProperty,
      },
    },
  });
};

export const updateResourceTitle = async (pageId: string, title: string) => {
  const titleProperty = title == '' ? [] : [{ text: { content: title } }];
  return notion.pages.update({
    page_id: pageId,
    properties: {
      title: {
        title: titleProperty,
      },
    },
  });
};

const deleteBlock = async (blockId: string) => {
  return notion.blocks.delete({
    block_id: blockId,
  });
};

/*let paragraphBlocks = blocks.filter((obj) => obj.type == 'paragraph' && obj.paragraph?.text.length > 0);
let bookmarksBlocks = blocks.filter((obj) => obj.type == 'bookmark');
let embedBlocks = blocks.filter((obj) => obj.type == 'embed');
logger.info('embedBlocks', embedBlocks);
let paragraphTexts = paragraphBlocks.map((pb) => { return pb.paragraph.text[0]?.plain_text });
let bookmarksTexts = bookmarksBlocks.map((pb) => { return pb.bookmark.url });
logger.info(paragraphTexts);
//logger.info(bookmarksTexts);
paragraphTexts.map(async (pO) => {
  logger.info('query metadata: ', pO);
  const metadata = await urlMetadata(pO);
  logger.info(pO, metadata);
});
*/
