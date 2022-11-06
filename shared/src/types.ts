import * as urlMetadata from 'url-metadata';
import { BookmarkBlockObjectResponse, GetBlockResponse, Heading2BlockObjectResponse, Heading3BlockObjectResponse, ParagraphBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import {
  PageObjectResponse,
  PartialPageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

export interface JsonLink {
  url: string;
  title: string;
}

export const isMetaResult = (arg: any): arg is urlMetadata.Result => {
  return arg.url !== undefined;
};

export const sequentially = async <T, P>(
  toPromise: (element: T) => Promise<P>,
  elements: T[]
): Promise<P[]> => {
  const results: P[] = [];
  await elements.reduce(async (sequence, element) => {
    await sequence;
    results.push(await toPromise(element));
  }, Promise.resolve());

  return results;
};

type BlockResp = Extract<
  GetBlockResponse,
  | { type: 'heading_1' }
  | { type: 'heading_2' }
  | { type: 'heading_3' }
  | { type: 'bookmark' }
  | { type: 'paragraph' }
>;


export const isBookmark = (obj: GetBlockResponse): obj is BookmarkBlockObjectResponse => {
  return 'type' in obj && obj.type === 'bookmark';
};
export const isHeading2 = (obj: GetBlockResponse): obj is Heading2BlockObjectResponse => {
  return 'type' in obj && obj.type === 'heading_2';
};
export const isHeading3 = (obj: GetBlockResponse): obj is Heading3BlockObjectResponse => {
  return 'type' in obj && obj.type === 'heading_3';
};
export const isParagraph = (obj: GetBlockResponse): obj is ParagraphBlockObjectResponse => {
  return 'type' in obj && obj.type === 'paragraph';
};

export function isFullPage(
  obj: PageObjectResponse | PartialPageObjectResponse,
): obj is PageObjectResponse {
  return typeof (obj as PageObjectResponse).url !== 'undefined';
};

export function isBlockOfData<T extends Record<string, unknown>>(
  obj: T,
): obj is T & BlockResp {
  return (
    'type' in obj &&
    (obj.type === 'heading_1' ||
      obj.type === 'heading_2' ||
      obj.type === 'heading_3' ||
      obj.type === 'bookmark' ||
      obj.type === 'paragraph')
  );
};

type AnyBlock = Extract<GetBlockResponse, { type: string }>;
type BlockType = AnyBlock['type'];
type Block<Type extends BlockType = BlockType> = Extract<
  AnyBlock,
  { type: Type }
>;
export function isFullBlock(block: GetBlockResponse): block is Block;
export function isFullBlock<Type extends BlockType>(
  block: GetBlockResponse,
  blockType: Type,
): block is Block<Type>;
export function isFullBlock<Type extends BlockType>(
  block: GetBlockResponse,
  type?: Type,
): block is Block<Type> {
  return 'type' in block && type ? block.type === type : true;
}
type AdjustedBlockResponse<T> = Partial<T> & { type?: string };