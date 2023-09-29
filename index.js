import { buildVideo } from './video_maker/videoBuilder.js';
import { uploadVideo } from './uploaders/uploadVideo.js';
import { uploadVideoToTiktok } from './uploaders/uploadVideoToTiktok.js';

const videoInstance = await buildVideo({
  subject: 'Paisajes imperdibles de Sonora, México',
  listLength: 5,
  asyncItemsBuild: false,
});

// await uploadVideoToTiktok(videoInstance.videoPath, videoInstance.title, videoInstance.hashtags.map(hash => hash.replace('#', '')));
// await uploadVideo(videoInstance.masterVideoPath, videoInstance.title, videoInstance.fullDescription);
