export const isMetaResult = (arg) => {
    return arg.url !== undefined;
};
export const sequentially = async (toPromise, elements) => {
    const results = [];
    await elements.reduce(async (sequence, element) => {
        await sequence;
        results.push(await toPromise(element));
    }, Promise.resolve());
    return results;
};
export const isBookmark = (obj) => {
    return 'type' in obj && obj.type === 'bookmark';
};
export const isHeading2 = (obj) => {
    return 'type' in obj && obj.type === 'heading_2';
};
export const isHeading3 = (obj) => {
    return 'type' in obj && obj.type === 'heading_3';
};
export const isParagraph = (obj) => {
    return 'type' in obj && obj.type === 'paragraph';
};
export function isFullPage(obj) {
    return typeof obj.url !== 'undefined';
}
;
export function isBlockOfData(obj) {
    return ('type' in obj &&
        (obj.type === 'heading_1' ||
            obj.type === 'heading_2' ||
            obj.type === 'heading_3' ||
            obj.type === 'bookmark' ||
            obj.type === 'paragraph'));
}
;
export function isFullBlock(block, type) {
    return 'type' in block && type ? block.type === type : true;
}
