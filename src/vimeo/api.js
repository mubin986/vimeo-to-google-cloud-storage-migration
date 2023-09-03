const axios = require("axios").default;

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

module.exports = {
  getVideoById,
  listVideos,
  deleteVideoById,
};
