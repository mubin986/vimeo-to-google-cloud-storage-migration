const axios = require("axios").default;
const fs = require("fs");
const path = require("path");

const client = axios.create({
  baseURL: "https://api.vimeo.com",
  headers: {
    Authorization: "bearer " + process.env.VIMEO_API_TOKEN,
  },
});

const getVideoById = async (id) => {
  try {
    const response = await client.get(`/videos/${id}`);
    return response.data;
  } catch (error) {
    console.log("ERROR getVideoById", error.response.data);
    return null;
  }
};

const listVideos = async ({ per_page = 25, page = 1 }) => {
  try {
    const response = await client.get(
      `/me/videos?page=${page}&per_page=${per_page}`
    );
    return response.data;
  } catch (error) {
    console.log("ERROR listVideos", error.response.data);
    return null;
  }
};

const deleteVideoById = async (id) => {
  try {
    const response = await client.delete(`/videos/${id}`);
    return response.data;
  } catch (error) {
    console.log("ERROR deleteVideoById", id, error.response.data);
    return null;
  }
};

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
    await fs.promises.rename(tempDownloadPath, savepath);
    console.log("💝 Video saved to", savepath);
    return savepath;
  } catch (error) {
    console.log("ERROR downloadVideoFromUrl", error);
    return null;
  }
};

module.exports = {
  getVideoById,
  listVideos,
  deleteVideoById,
  downloadVideoFromUrl,
};
