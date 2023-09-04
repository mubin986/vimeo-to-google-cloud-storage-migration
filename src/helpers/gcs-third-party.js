const path = require("path");
const fs = require("fs");
const thirdPartyApi = require("../third-party/videoclient");
const storage = require("../gcp/cloud-storage");

const thirdPartyJsonPath = path.resolve(
  __dirname,
  "..",
  "data",
  `third-party.json`
);
const gcsBucketJsonPath = path.resolve(
  __dirname,
  "..",
  "data",
  `gcs-bucket.json`
);
const remainingThirdPartyJsonPath = path.resolve(
  __dirname,
  "..",
  "data",
  `third-party-remaining.json`
);

const listVideosFromThirdParty = async () => {
  const data = await thirdPartyApi.listVideos({ page_size: 15000 });
  fs.writeFileSync(thirdPartyJsonPath, JSON.stringify(data, null, 2));
};

const listGcsVideos = async () => {
  let data = await storage.getFiles();
  data = data.map((x) => x.metadata);
  fs.writeFileSync(gcsBucketJsonPath, JSON.stringify(data, null, 2));
};

const findRemainingVideos = async () => {
  const thirdPartyData = JSON.parse(
    fs.readFileSync(thirdPartyJsonPath, "utf8")
  );
  const gcsBucketData = JSON.parse(fs.readFileSync(gcsBucketJsonPath, "utf8"));
  const thirdPartyIds = thirdPartyData.result.map((x) =>
    x.reference_id && isFinite(x.reference_id)
      ? x.reference_id
      : x.custom_id1 || null
  );
  const gcsBucketIds = gcsBucketData.map(
    (x) => x.name.split("/")[1].split("-")[0]
  );
  const remainingIds = thirdPartyIds.filter(
    (x) => x && !gcsBucketIds.includes(x)
  );
  fs.writeFileSync(
    remainingThirdPartyJsonPath,
    JSON.stringify(remainingIds, null, 2)
  );
};

const getGcsVideoList = async () => {
  if (!fs.existsSync(gcsBucketJsonPath)) {
    await listGcsVideos();
  }
  return JSON.parse(fs.readFileSync(gcsBucketJsonPath, "utf8"));
};

const getThirdPartyVideoList = async () => {
  if (!fs.existsSync(thirdPartyJsonPath)) {
    await listVideosFromThirdParty();
  }
  return JSON.parse(fs.readFileSync(thirdPartyJsonPath, "utf8"));
};

const processThirdPartyAndGcs = async () => {
  console.log("Start");
  await listVideosFromThirdParty();
  console.log("Third party done");
  await listGcsVideos();
  console.log("GCS done");
  findRemainingVideos();
  console.log("Done");
};

module.exports = {
  getGcsVideoList,
  getThirdPartyVideoList,
  processThirdPartyAndGcs,
};
