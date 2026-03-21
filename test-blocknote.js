const { BlockNoteEditor } = require("@blocknote/core");

async function test() {
  const md = `| header1 | header2 |
| --- | --- |
| row1 | row2 |`;

  const editor = BlockNoteEditor.create();
  const blocks = await editor.tryParseMarkdownToBlocks(md);
  console.log(JSON.stringify(blocks, null, 2));
}

test();
