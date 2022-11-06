/* eslint-disable prettier/prettier */
import urlMetadata from 'url-metadata';
import validUrl from 'valid-url';
import { CreateDatabaseResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { writeFile, readDir, readFile, jsonToString } from '../utils.js';
import { notion } from '../api/notion/client.js';;
import { JsonLink, isMetaResult, isHeading2, isHeading3, isBookmark } from '../types.js';
import { create } from 'lodash';

export const loadLinksFromRoot = async () => {
  const rawdata = await readFile(
    `/Users/stan/Dev/_Side/@Drills/drilllist-server/data/reading_list_dbs.json`,
  );
  const linksPerDb = JSON.parse(rawdata.toString());
  for (const db of linksPerDb) {
    const rawLinkData = await readFile(
      `/Users/stan/Dev/_Side/@Drills/drilllist-server/data/reading_list/${db.title}.json`,
    );
    const linkData = JSON.parse(rawLinkData.toString());
    console.log(db.title, linkData.length);
    const parsedLinks = await Promise.all<JsonLink>(parseJsonLinksByUrl(linkData));
    await appendJsonLinksToDatabase(db.id, parsedLinks);
  }
};

const parseJsonLinks = async (title: string) => {
  const rawdata = await readFile(
    `/Users/stan/Dev/_Side/@Drills/drilllist-server/data/${title}.json`,
  );
  const urls: Promise<JsonLink>[] = JSON.parse(rawdata.toString()).map(
    (url) => {
      if (validUrl.isUri(url.url)) {
        return urlMetadata(url.url)
          .catch((err: any) => {
            console.error(url.url, err);
            return new Error(`Error getting metadata for ${url}`);
          })
          .then((metaData) => {
            if (isMetaResult(metaData) && metaData.title != null) {
              return { url: url.url, title: metaData.title };
            } else {
              // console.log('title not defined', url.url);
              return { url: url.url, title: '' }; // TODO: Error handling
            }
          });
      } else {
        console.log('url not valid', url.url);
        return null; // TODO: Error handling
      }
    },
  ).filter(Boolean);
  return urls;
};
const parseJsonLinksByUrl = (linkData: any[]): Promise<JsonLink>[] => {
  const urls: Promise<JsonLink>[] = linkData.map(
    (url) => {
      if (validUrl.isUri(url.url)) {
        return urlMetadata(url.url)
          .catch((err: any) => {
            console.error(url.url, err);
            return new Error(`Error getting metadata for ${url}`);
          })
          .then((metaData) => {
            if (isMetaResult(metaData) && metaData.title != null) {
              return { url: url.url, title: metaData.title } as JsonLink;
            } else {
              // console.log('title not defined', url.url);
              return { url: url.url, title: '' } as JsonLink; // TODO: Error handling
            }
          });
      } else {
        console.log('url not valid', url.url);
        return null; // TODO: Error handling
      }
    },
  ).filter(Boolean) as Promise<JsonLink>[];
  return urls;
};

const appendJsonLinksToDatabase = async (databaseId: string, links: JsonLink[]) => {
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
          } as any,
          URL: {
            url: link.url,
          },
        },
      });
    } else {
      // console.log(link);
    }
  });
};

export const parseJsonLinkTitles = async (path: string): Promise<string[]> =>
  await readDir(path).then((titles) => titles.map((t) => t.replace('.json', '')));

interface PagePerDB {
  title: string,
  id: string
}
const delay = (time) => {
  return new Promise(resolve => setTimeout(resolve, time));
} 

export const parseJsonLinksCreateDatabases = async (parentId: string) => {
  // const links = await parseJsonLinks(title);
  // const linksResolved = await Promise.all(links);
  // console.log('linkResolved', linksResolved)
  const dirs = await parseJsonLinkTitles('/Users/stan/Dev/_Side/@Drills/drilllist-server/data/reading_list');
  console.log(dirs);
  const databasePerPage = []
  for (const pageTitle of dirs) {
    try {
      const response = await createDatabase(parentId, pageTitle);
      databasePerPage.push({
        title: pageTitle,
        id: response.id,
      } as never)
    } catch (e) {
      console.log('e', e, pageTitle);
    }
  }
  if (databasePerPage.length > 0) {
    await writeFile(
      `/Users/stan/Dev/_Side/@Drills/drilllist-server/data/reading_list_dbs.json`,
      jsonToString(databasePerPage),
    );
  }
  //await appendJsonLinksToDatabase(databaseId, linksResolved.filter(Boolean));
};

const readingListProps = (): Record<string, any> => {
  return {
      Title: { title: {} },
      URL: { url: {} },
  }
}

const createDatabase = async (parentId: string, title: string): Promise<CreateDatabaseResponse> => {
  console.log('createDb', title)
  return await notion.databases.create(
    {
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
    }
  );
}
