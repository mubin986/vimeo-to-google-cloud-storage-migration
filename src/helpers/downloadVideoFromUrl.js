const axios = require("axios").default;
const fs = require("fs");
const path = require("path");
const hlsDownloader = require("node-hls-downloader");

const downloadVideoFromUrl = async ({
  url,
  filename,
  dirname,
  onProgress = false,
}) => {
  try {
    const tempDownloadPath = path.resolve("temp", filename);
    const savepath = path.resolve(dirname, filename);
    console.log("Downloading video from", url, "to", savepath);
    let downloadPercentage = 0;
    if (url.includes(".m3u8")) {
      if (onProgress) onProgress(0);
      await hlsDownloader.download({
        quality: "best",
        concurrency: 20,
        outputFile: tempDownloadPath,
        streamUrl: url,
        logger: null,
      });
      if (onProgress) onProgress(100);
    } else {
      const response = await axios.get(url, {
        responseType: "stream",
        onDownloadProgress: !onProgress
          ? null
          : (progressEvent) => {
              let percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              if (
                percentCompleted % 10 == 0 &&
                percentCompleted > downloadPercentage
              ) {
                downloadPercentage = percentCompleted;
                onProgress(downloadPercentage);
              }
            },
      });
      console.log("Saving video to", tempDownloadPath);
      await fs.promises.writeFile(tempDownloadPath, response.data);
    }
    await fs.promises.rename(tempDownloadPath, savepath);
    console.log("💝 Video saved to", savepath);
    return savepath;
  } catch (error) {
    console.log("ERROR downloadVideoFromUrl", error);
    return null;
  }
};

module.exports = {
  downloadVideoFromUrl,
};
