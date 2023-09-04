const {
  formatM3u8Array,
  getM3u8Stream,
} = require("../packages/m3u8-stream-list");
const axios = require("axios").default;

const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
const apiKey = process.env.BUNNY_STREAM_API_KEY;
const pullZoneUrl = process.env.BUNNY_STREAM_PULL_ZONE_URL;

const videoClient = axios.create({
  baseURL: process.env.BUNNY_STREAM_BASE_URL,
  headers: {
    AccessKey: apiKey,
  },
});

const utils = {
  getDirectPlayUrl: (video_id) =>
    `${pullZoneUrl}/play/${libraryId}/${video_id}`,
  getOriginalFile: (video_id) => `${pullZoneUrl}/${video_id}/original`,
  getHlsPlaylistUrl: (video_id) => `${pullZoneUrl}/${video_id}/playlist.m3u8`,
  getThumbnailUrl: (video_id, thumbnail_file_name = "thumbnail.jpg") =>
    `${pullZoneUrl}/${video_id}/${thumbnail_file_name}`,
  getPreviewAnimationUrl: (video_id) =>
    `${pullZoneUrl}/${video_id}/preview.webp`,
  getMp4VideoUrl: (video_id, resolution_height = 720) =>
    `${pullZoneUrl}/${video_id}/play_${resolution_height}p.mp4`,
  getSubtitleFileUrl: (video_id, language_code) =>
    `${pullZoneUrl}/${video_id}/captions/${language_code}.vtt`,
};

const fetchVideoByUrl = async ({ title, url, _id }) => {
  try {
    const response = await videoClient.post(
      `/library/${libraryId}/videos/fetch`,
      { url }
    );
    setTimeout(() => {
      const body = {
        title,
      };
      if (_id) {
        body.metaTags = [
          {
            property: "_id",
            value: _id,
          },
        ];
      }
      updateVideoById(response.data.id, body);
    }, 5000);
    return response.data;
  } catch (error) {
    console.log("ERROR fetchVideoByUrl");
    return null;
  }
};

const getVideoById = async (id) => {
  try {
    const response = await videoClient.get(
      `/library/${libraryId}/videos/${id}`
    );
    return response.data;
  } catch (error) {
    console.log("ERROR getVideoById");
    return null;
  }
};

const listVideos = async ({ page_size = 100, page = 1, orderBy = "date" }) => {
  try {
    const response = await videoClient.get(
      `/library/${libraryId}/videos?itemsPerPage=${page_size}&page=${page}&orderBy=${orderBy}`
    );
    return response.data;
  } catch (error) {
    console.log("ERROR listVideos");
    return null;
  }
};

const deleteVideoById = async (id) => {
  try {
    const response = await videoClient.delete(
      `/library/${libraryId}/videos/${id}`
    );
    console.log("deleteVideoById", id, response.data);
    return response.data;
  } catch (error) {
    console.log("ERROR deleteVideoById", id);
    return null;
  }
};

const updateVideoById = async (
  id,
  { title, collectionId, chapters, moments, metaTags }
) => {
  try {
    const response = await videoClient.post(
      `/library/${libraryId}/videos/${id}`,
      { title, collectionId, chapters, moments, metaTags }
    );
    return response.data;
  } catch (error) {
    console.log("ERROR updateVideoById", id);
    return null;
  }
};

const processBunnyStreamVideoDetail = async (data = {}) => {
  if (!data) return {};
  const obj = {};
  const manifest_url = utils.getHlsPlaylistUrl(data.guid);
  const playlist_hls = formatM3u8Array(await getM3u8Stream(manifest_url));
  const bunny_data = {
    response_object: data,
    manifest_url,
    playlist_hls,
    playlist_mp4: [],
  };
  obj.duration = data.length;
  obj.bunny_data = bunny_data;
  // obj.bunny_id = data.guid;
  return obj;
};

module.exports = {
  getVideoById,
  listVideos,
  deleteVideoById,
  updateVideoById,
  fetchVideoByUrl,
  utils,
  processBunnyStreamVideoDetail,
};
