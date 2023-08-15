require("dotenv").config();
const fs = require("fs");
const { getVideoById, downloadVideoFromUrl } = require("./vimeo/api");
const { getVimeoHighestQualityDownloadLink } = require("./utils");
const vimeoIds = require("./data/vimeo_ids.json");
const storage = require("./gcp/cloud-storage");

const mediaDir = "media";
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir);
}

const main = async () => {
  let c = 0;
  for (const id of vimeoIds) {
    try {
      console.log(++c, "/", vimeoIds.length);
      const video = await getVideoById(id);
      if (!video) {
        console.log(`[x] #--> Video ${id} not found`);
        continue;
      }
      const url = getVimeoHighestQualityDownloadLink(video);
      if (!url) {
        console.log(`[x] #--> Video ${id} has no download link`);
        continue;
      }
      console.log(id, "->", url);
      const filename = `${id}.mp4`;
      const savepath = `${mediaDir}/${filename}`;
      if (fs.existsSync(savepath)) {
        console.log(
          `[###] Video ${id} already downloaded before -> ${savepath}}`
        );
        await storage.uploadVideo({
          filename,
          filepath: savepath,
          destination: `backup/${id}-${video.name}.mp4`,
          showProgress: true,
          makePublic: true,
        });
      } else {
        await downloadVideoFromUrl({
          url,
          savepath,
          showProgress: true,
        });
        await storage.uploadVideo({
          filename,
          filepath: savepath,
          destination: `backup/${id}-${video.name}.mp4`,
          showProgress: true,
          makePublic: true,
        });
      }

      fs.rmSync(savepath);
      console.log(
        "[###] COMPLETE Video",
        id,
        "downloaded and uploaded to GCP, removed from local"
      );
    } catch (error) {
      console.log(c, id, "ERROR", error);
    }
  }
};

main();
