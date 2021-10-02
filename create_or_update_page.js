const { Client } = require("@notionhq/client")

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})


;(async () => {
  const pageId = '0c1dc12c-bb97-4ebf-b935-5dce3f21a7fb';
  const pageObject = await notion.pages.retrieve({ page_id: pageId });
  const pageBlocks = await notion.blocks.children.list({ block_id: pageId, page_size: 50});
  let blocks = pageBlocks.results;

  if (blocks.length > 0) {
    let countBlock = blocks.find((blockObject) => {
      if (blockObject.type == 'paragraph' && blockObject.paragraph.text[0]?.plain_text.includes('Total Count:')) {
        return true;
      } else { return false }
    });
    
    console.log('countBlock', countBlock);
    if (countBlock) {
      const countBlockId = countBlock.id;
      const parseAttempt = parseInt(countBlock.paragraph.text[0]?.plain_text.match(/(?!Total Count: )(\d)+/)[0]);
      console.log(
        countBlock.paragraph.text[0]?.plain_text.match(/(?!Total Count: )(\d)+/),
        countBlock.paragraph.text[0]?.plain_text.match(/(?!Total Count: )(\d)+/)[0],
        parseInt(countBlock.paragraph.text[0]?.plain_text.match(/(?!Total Count: )(\d)+/)[0])
      );
      const totalCountText = parseAttempt ? parseAttempt + 1 : 1;
      const response = await notion.blocks.update({
        block_id: countBlockId,
        paragraph: {
          "text": [{
            "type": "text",
            "text": {
              "content": `Total Count: ${totalCountText}`,
              "link": null
            }
          }],
        }
      });    
      console.log('Update status:', response);
    } else {
      console.error('Something went wrong. List of block is empty');
    }
  } else {
    console.error('Something went wrong. List of block is empty');
  }
})()

