import { buildVideo } from './video_maker/videoBuilder.js';
import { uploadVideo } from './uploaders/uploadVideo.js';
import { uploadVideoToTiktok } from './uploaders/uploadVideoToTiktok.js';

const subject = process.argv[3];
const listLength = Number(process.argv[2]);
const shouldUpload = process.argv[4] === 'true';

const videoInstance = await buildVideo({
  subject,
  listLength,
  asyncItemsBuild: false,
});

if (shouldUpload) {
  await uploadVideoToTiktok(videoInstance);
  await uploadVideo(videoInstance);
}