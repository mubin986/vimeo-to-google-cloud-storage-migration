const fs = require("fs");

module.exports = {
  parseVideoTitleFromGcsName: (name, prefix = "videos/") => {
    let title = name.replaceAll(prefix, "");
    title = title.replaceAll(".mp4", "");
    return title;
  },
  getFilesizeInBytes: (filepath) => {
    const stats = fs.statSync(filepath);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
  },
  getVimeoHighestQualityDownloadLink: (data) => {
    const { download } = data || {};
    if (!download) return null;
    let maxWidth = 0;
    let downloadLink = null;
    for (const item of download) {
      if (item.width > maxWidth) {
        maxWidth = item.width;
        downloadLink = item.link;
      }
    }
    return downloadLink;
  },
  parseVimeoIdFromUri: (uri) => {
    return parseInt(uri.match(/\d+/)[0]);
  },

  vimeoIdToPlayerLink: (vimeoId) => {
    return "https://player.vimeo.com/video/" + vimeoId;
  },
};
