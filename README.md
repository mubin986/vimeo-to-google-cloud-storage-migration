**Step 1:** run `npm i`
<br/>
**Step 2:** put `VIMEO_API_TOKEN` and `BUCKET_NAME` into `.env`
<br/>
**Step 3:** copy your gcs service account json file in the root of the directory and rename it to `cloud-storage-key.json`
<br/>
**Step 4:** copy your vimeo ids containing json into `src/data` and rename it to `vimeo_ids.json`. you can see `vimeo_ids_sample.json` which represents how the json should look like
<br/>
**Step 5:** run `npm start`. you can use `pm2` library to run the process in the background
<br/>
<br/>

Cheers!
