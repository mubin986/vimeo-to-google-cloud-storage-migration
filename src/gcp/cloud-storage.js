const { Storage } = require("@google-cloud/storage");
const fs = require("fs");
const { getFilesizeInBytes } = require("../utils");

const storage = new Storage({ keyFilename: "cloud-storage-key.json" });

const bucketName = process.env.BUCKET_NAME;
const bucket = storage.bucket(bucketName);

const createBucket = async () => {
  try {
    await storage.createBucket(bucketName, {
      location: "asia-southeast1",
    });
    console.log(`Bucket ${bucketName} created.`);
  } catch (error) {
    console.log("ERROR createBucket:", error);
  }
};

const getFiles = async (prefix) => {
  try {
    const [files] = await storage.bucket(bucketName).getFiles({ prefix });
    // console.log("Files:");
    // files.forEach((file) => {
    //   console.log(file.name);
    // });
    return files;
  } catch (error) {
    console.log("ERROR getFiles:", error);
  }
};

const isFileExist = async (prefix) => {
  try {
    const fileExist = await bucket.getFiles({
      prefix,
    });
    return fileExist[0].length > 0;
  } catch (error) {
    console.log("ERROR isFileExist:", error);
    return false;
  }
};

const uploadVideo = async ({
  filepath,
  filename,
  destination,
  autoRemoveFromLocal = true,
  onProgress = null,
  makePublic = false,
}) => {
  try {
    const fileExist = await bucket.file(destination).exists();
    if (fileExist[0]) {
      console.log("File already exists.", { filename, destination });
      return null;
    }
    const totalBytes = getFilesizeInBytes(filepath);
    console.log(
      "⬆️ ⬆️ ⬆️ Uploading",
      filename,
      "with size",
      totalBytes,
      "bytes. ->",
      Math.round(totalBytes / 1024 / 1024),
      "MB"
    );
    let uploadPercentage = 0;
    const response = await bucket.upload(filepath, {
      public: makePublic,
      destination,
      onUploadProgress: !onProgress
        ? null
        : (data) => {
            const newPercentage = Math.floor(
              (data.bytesWritten / totalBytes) * 100
            );
            if (newPercentage % 10 == 0 && newPercentage > uploadPercentage) {
              uploadPercentage = newPercentage;
              onProgress(uploadPercentage);
            }
          },
    });
    console.log(`✅ ${filepath} uploaded to ${bucketName}.`);
    if (autoRemoveFromLocal) {
      fs.rmSync(filepath);
      console.log("💦 Removed from local", filepath);
    }
    return response;
  } catch (error) {
    console.log("ERROR uploadVideo:", error);
    return null;
  }
};

module.exports = {
  createBucket,
  uploadVideo,
  getFiles,
  isFileExist,
};
