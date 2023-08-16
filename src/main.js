require("dotenv").config();
const fs = require("fs");
const { getVideoById, downloadVideoFromUrl } = require("./vimeo/api");
const { getVimeoHighestQualityDownloadLink } = require("./utils");
const vimeoIds = require("./data/vimeo_ids.json");
const storage = require("./gcp/cloud-storage");

const dirs = ["media", "temp"];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const downloadAndUpload = async ({ id, c, total, i }) => {
  try {
    const counter = `(${i} <> ${c} / ${total})`;
    console.log(counter);
    const prefix = `videos/${id}`;
    const filename = `${id}.mp4`;
    const savepath = `media/${filename}`;
    const destination = `${prefix}-${video.name}.mp4`;

    const fileExist = await storage.isFileExist(prefix);
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

const main = async () => {
  let concurrency = 50;

  let c = 0;
  let i = 0;
  let p_arr = [];
  const total = vimeoIds.length;
  for (const id of vimeoIds) {
    c++;
    i++;
    p_arr.push(downloadAndUpload({ id, c, total, i }));
    if (p_arr.length >= concurrency) {
      await Promise.all(p_arr);
      p_arr = [];
      i = 0;
    }
  }
};

main();
