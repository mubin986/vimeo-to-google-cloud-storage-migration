require("dotenv").config();
const fs = require("fs");
const {
  getVideoById,
  downloadVideoFromUrl,
  listVideos,
} = require("./vimeo/api");
const { getVimeoHighestQualityDownloadLink } = require("./utils");
const vimeoIds = require("./data/vimeo_ids.json");
const storage = require("./gcp/cloud-storage");
const path = require("path");

const dirs = ["media", "temp", "src/data/vimeo-db"];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let skipCount = 0;

const downloadAndUpload = async ({ id, c, total, i, checkFromGcs = false }) => {
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
    const video = await getVideoById(id);
    if (!video) {
      console.log(`[x] #--> Video ${id} not found`);
      return;
    }
    const url = getVimeoHighestQualityDownloadLink(video);
    if (!url) {
      console.log(`[x] #--> Video ${id} has no download link`);
      return;
    }
    console.log(id, "->", url);
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

const startDownloadUpload = async () => {
  let concurrency = 50;

  let c = 0;
  let i = 0;
  let p_arr = [];
  const total = vimeoIds.length;
  for (const id of vimeoIds) {
    c++;
    i++;
    p_arr.push(downloadAndUpload({ id, c, total, i, checkFromGcs: true }));
    if (p_arr.length >= concurrency) {
      await Promise.all(p_arr);
      p_arr = [];
      i = 0;
    }
  }
};

const fetchAndSaveVimeoVideos = async (page = 1, totalPage) => {
  totalPage = totalPage ? Math.ceil(totalPage) : null;
  console.log(`Fetching page ${page} out of ${totalPage}`);
  const per_page = 100;
  const data = await listVideos({ per_page, page });
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
  startDownloadUpload();
};

main();
