require("dotenv").config();
const fs = require("fs");
const vimeoApi = require("./vimeo/api");
const thirdPartyApi = require("./third-party/videoclient");
const { getVimeoHighestQualityDownloadLink } = require("./utils");
const storage = require("./gcp/cloud-storage");
const path = require("path");
const { downloadVideoFromUrl } = require("./helpers/downloadVideoFromUrl");
const { processThirdPartyAndGcs } = require("./helpers/gcs-third-party");

const dirs = ["media", "temp", "src/data/vimeo-db"];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let skipCount = 0;

const downloadAndUpload = async ({
  id,
  c,
  total,
  i,
  checkFromGcs = false,
  platform = "vimeo",
  manifest_url,
  title,
}) => {
  try {
    const skipPath = path.join(__dirname, "data", "vimeo_ids_skip.json");
    let videoIdsSkip = fs.existsSync(skipPath)
      ? JSON.parse(fs.readFileSync(skipPath))
      : [];
    videoIdsSkip = Array.from(videoIdsSkip, (x) => `${x}`);

    const counter = `(${i} <> ${c} / ${total})`;
    // console.log(counter);
    const prefix = `videos/${id}`;
    const filename = `${id}.mp4`;
    const savepath = `media/${filename}`;

    let fileExist = false;
    if (videoIdsSkip.includes(`${id}`)) {
      skipCount++;
      fileExist = true;
      console.log(`${counter} [x] #--> Video ${id} already uploaded before`, {
        skipCount,
      });
    } else if (checkFromGcs) {
      fileExist = await storage.isFileExist(prefix);
    }

    if (fileExist) {
      console.log(`${counter} [x] #--> Video ${id} already uploaded before`);
      if (fs.existsSync(savepath)) {
        fs.unlinkSync(savepath);
        console.log("💦 Removed from local", savepath);
      }
      return;
    }
    const video =
      manifest_url && title
        ? { result: { manifest_url, name: title } }
        : platform == "vimeo"
        ? await vimeoApi.getVideoById(id)
        : await thirdPartyApi.getVideoByCustomId(id);
    if (!video) {
      console.log(`[x] #--> Video ${id} not found`);
      return;
    }
    const url =
      platform == "vimeo"
        ? getVimeoHighestQualityDownloadLink(video)
        : video.result?.manifest_url;
    if (!url) {
      console.log(`[x] #--> Video ${id} has no download link`);
      return;
    }
    console.log(id, "->", url);
    video.name = video.name || video.result?.name;
    const destination = `${prefix}-${video.name}.mp4`;
    if (fs.existsSync(savepath)) {
      console.log(
        `[###] Video ${id} already downloaded before -> ${savepath}}`
      );
      await storage.uploadVideo({
        filename,
        filepath: savepath,
        destination,
        onProgress: (percentage) => {
          console.log("⬆️", counter, filename, "-> Uploaded", percentage, "%");
        },
        makePublic: true,
      });
    } else {
      await downloadVideoFromUrl({
        url,
        filename,
        dirname: "media",
        onProgress: (percentage) => {
          console.log(
            "🔻",
            counter,
            "Download progress",
            savepath,
            percentage,
            "%"
          );
        },
      });
      await storage.uploadVideo({
        filename,
        filepath: savepath,
        destination,
        onProgress: (percentage) => {
          console.log("⬆️", counter, filename, "-> Uploaded", percentage, "%");
        },
        makePublic: true,
      });
    }
  } catch (error) {
    console.log(c, id, "ERROR", error);
  }
};

const displayDownUpStatus = () => {
  const downPath = path.resolve(__dirname, "..", "temp");
  const upPath = path.resolve(__dirname, "..", "media");
  const downCount = fs.readdirSync(downPath).length;
  const upCount = fs.readdirSync(upPath).length;
  console.log(
    `🙄 Downloading: 🔻 ${downCount}, 🔼 Uploading: ${upCount}, i -> ${i}, p_arr -> ${p_arr.length}`
  );
};

let i = 0;
let p_arr = [];
const startDownloadUpload = async ({ platform }) => {
  if (!platform) {
    console.log("Please provide platform");
    return;
  }
  let concurrency = 6;

  let c = 0;
  const videoIds =
    platform == "vimeo"
      ? require("./data/vimeo_ids.json")
      : require("./data/third-party-remaining.json");
  const recordings = require("./data/db-recordings.json");
  const arr = recordings.filter((item) => !item.bunny_id) || videoIds;
  console.log("Total videos", arr.length);
  // return;
  const total = arr.length;
  setInterval(displayDownUpStatus, 5000);
  for (const item of arr) {
    c++;
    i++;
    p_arr.push(
      downloadAndUpload({
        id: typeof item == "string" ? item : item._id,
        c,
        total,
        i,
        checkFromGcs: true,
        platform,
        manifest_url: item?.manifest_url,
        title: item?.title,
      })
    );
    if (p_arr.length >= concurrency) {
      await Promise.all(p_arr);
      p_arr = [];
      i = 0;
    }
  }
  console.log("******* ALL DONE *******");
};

const fetchAndSaveVimeoVideos = async (page = 1, totalPage) => {
  totalPage = totalPage ? Math.ceil(totalPage) : null;
  console.log(`Fetching page ${page} out of ${totalPage}`);
  const per_page = 100;
  const data = await vimeoApi.listVideos({ per_page, page });
  if (!data) {
    console.log("ERROR fetchAndSaveVimeoVideos", page);
    return;
  }
  fs.writeFileSync(
    path.resolve(__dirname, "data", "vimeo-db", `page-${page}.json`),
    JSON.stringify(data, null, 2)
  );
  console.log(`Saved page ${page} out of ${totalPage}`);
  if (data.paging.next) {
    await fetchAndSaveVimeoVideos(page + 1, data.total / per_page);
  }
};

const vimeoVideosToIds = () => {
  console.log("Vimeo videos to ids -> start");
  const files = fs.readdirSync(path.resolve(__dirname, "data", "vimeo-db"));
  const ids = [];
  for (const file of files) {
    const data = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "data", "vimeo-db", file), "utf8")
    );
    for (const video of data.data) {
      ids.push(video.uri.split("/")[2]);
    }
  }
  fs.writeFileSync(
    path.resolve(__dirname, "data", "vimeo_ids.json"),
    JSON.stringify(ids, null, 2)
  );
  console.log("Vimeo videos to ids -> done");
};

const main = async () => {
  // processThirdPartyAndGcs();
  startDownloadUpload({ platform: "third-party" });
};

main();
