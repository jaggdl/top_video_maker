import { buildVideo } from './video_maker/videoBuilder.js';
import { uploadVideo } from './uploaders/uploadVideo.js';
import { uploadVideoToTiktok } from './uploaders/uploadVideoToTiktok.js';

const subject = process.argv[3];
const listLength = Number(process.argv[2]);
const shouldUpload = process.argv[4] === 'true';

const videoInstance = await buildVideo({
  subject,
  listLength,
  formats: [
    [1920, 1080],
  ]
});

if (shouldUpload) {
  await Promise.all([
    // uploadVideoToTiktok(videoInstance),
    uploadVideo(videoInstance),
  ]);
}