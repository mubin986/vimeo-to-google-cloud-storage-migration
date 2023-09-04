require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { getGcsVideoList } = require("./helpers/gcs-third-party");
const bs = require("./third-party/bunnystream");
const { parseVideoTitleFromGcsName } = require("./utils");

const main = async () => {
  const gcsBucketData = await getGcsVideoList();
  const total = gcsBucketData.length;
  console.log("total videos", total);
  let c = 0;
  const dir = path.join(__dirname, "data", "migration");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  for (const item of gcsBucketData) {
    c++;
    const title = parseVideoTitleFromGcsName(item.name);
    const url = item.mediaLink;
    const _id = title.split("-")[0];
    const filepath = path.join(dir, `${_id}.json`);
    if (fs.existsSync(filepath)) {
      console.log(`[x] -> already exists : ${c}/${total} ${title}`);
      continue;
    }
    const response = await bs.fetchVideoByUrl({
      title,
      url,
      _id,
    });
    if (!response) {
      console.log(`${c}/${total} ${title} failed`);
      break;
    }
    fs.writeFileSync(
      filepath,
      JSON.stringify({ c, title, url, _id, response }, null, 2),
      {}
    );
    console.log(`${c}/${total} uploading -> ${title}`);
    // if (c >= 100) break;
  }
  console.log("All done!");
};

main();
