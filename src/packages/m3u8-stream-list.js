
const reader = require("m3u8-reader");
const axios = require("axios").default;

const TAG_STREAM = "STREAM-INF";

module.exports = { m3u8, formatM3u8Array, getM3u8Stream };

function formatM3u8Array(arr) {
  return arr.map(function (obj) {
    const preset = `${obj.RESOLUTION.split("x")[1]}p`;
    return {
      quality: parseInt(preset) >= 720 ? "hd" : "sd",
      resolution: preset,
      type: "application/x-mpegURL",
      file_url: obj.url,
    };
  });
}

async function getM3u8Stream(url) {
  const res = await axios.get(url);
    return m3u8(res.data, url);
}

/**
 * Parser
 * @param {String} playlist
 * @return {Array.<{url: string}>}
 */
function m3u8(playlist, playlistUrl) {
  return reader(playlist).reduce(function (streams, url, i, pl) {
    if (is_url(url)) {
      if (playlistUrl) {
        const baseUrl = playlistUrl.split("/").slice(0, -1).join("/");
        url = `${baseUrl}/${url}`;
      }
      const stream = pl[i - 1];
      if (
        typeof stream == "object" &&
        stream[TAG_STREAM] &&
        typeof stream[TAG_STREAM] == "object"
      ) {
        streams.push(Object.assign({ url }, stream[TAG_STREAM]));
      }
    }

    return streams;
  }, []);
}

/**
 * @param {string} url
 * @return {boolean}
 */
function is_url(url) {
  return (
    typeof url == "string" &&
    (url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.includes(".m3u8"))
  );
}
