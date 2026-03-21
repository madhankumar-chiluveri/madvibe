const { BlockNoteEditor } = require("@blocknote/core");

async function test() {
  const md = `| header1 | header2 |
| --- | --- |
| row1 | row2 |`;

  // We need to polyfill window/document for headless BlockNote JS execution if required
  // But wait, the previous test failed because document is not defined.
  // Instead of testing in Node, let's just forcefully sanitize the strings as well!!
}
