const fs = require('fs');
const JSZip = require('jszip');

async function run() {
  try {
    const data = fs.readFileSync('C:\\Users\\madhankumar.ch\\Downloads\\86a89e38-2f94-48b3-b7bd-4682a8fbd630_ExportBlock-7d36d5b1-418b-48fb-891b-de899de0a4f6.zip');
    const zip = await JSZip.loadAsync(data);
    const files = Object.keys(zip.files);
    console.log(files);
  } catch (e) {
    console.error(e);
  }
}
run();
