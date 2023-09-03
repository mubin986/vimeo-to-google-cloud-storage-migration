const axios = require("axios").default;

const clientId = process.env.VIDEO_STORAGE_CLIENT_ID;
const libraryId = process.env.VIDEO_STORAGE_LIBRARY_ID;
const apiKey = process.env.VIDEO_STORAGE_API_KEY;

const videoClient = axios.create({
  baseURL: process.env.VIDEO_STORAGE_BASE_URL,
  headers: {
    "X-Auth-ClientId": clientId,
    "X-Auth-LibraryId": libraryId,
    "X-Auth-ApiKey": apiKey,
  },
});

const getVideoById = async (id) => {
  try {
    const response = await videoClient.get(
      `/libraries/${libraryId}/videos/${id}`
    );
    return response.data;
  } catch (error) {
    console.log("ERROR getVideoById");
    return null;
  }
};

const listVideos = async ({ page_size = 100 }) => {
  try {
    const response = await videoClient.get(
      `/libraries/${libraryId}/videos?per_page=${page_size}`
    );
    return response.data;
  } catch (error) {
    console.log("ERROR listVideos");
    return null;
  }
};

const getVideoByCustomId = async (custom_id) => {
  try {
    const response = await videoClient.get(
      `/libraries/${libraryId}/videos/custom/custom_id1/${custom_id}`
    );
    return response.data;
  } catch (error) {
    console.log("ERROR getVideoByCustomId");
    return null;
  }
};

const getVideoByReferenceId = async (reference_id) => {
  try {
    const response = await videoClient.get(
      `/libraries/${libraryId}/videos/custom/reference_id/${reference_id}`
    );
    return response.data;
  } catch (error) {
    console.log("ERROR getVideoByReferenceId", reference_id);
    return null;
  }
};

const deleteVideoById = async (id) => {
  try {
    const response = await videoClient.delete(
      `/libraries/${libraryId}/videos/${id}`
    );
    console.log("deleteVideoById", id, response.data);
    return response.data;
  } catch (error) {
    console.log("ERROR deleteVideoById", id);
    return null;
  }
};

module.exports = {
  getVideoById,
  listVideos,
  getVideoByCustomId,
  getVideoByReferenceId,
  deleteVideoById,
};
