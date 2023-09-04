require("dotenv").config();
const {
  getThirdPartyVideoList,
  getGcsVideoList,
} = require("./helpers/gcs-third-party");
const bs = require("./third-party/bunnystream");

const main = async () => {
  const gcsBucketData = await getGcsVideoList();
  for (const item of gcsBucketData) {
    bs.fetchVideoByUrl({
      // title: item.na
    });
    break;
  }
};

main();
