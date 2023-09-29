import { buildVideo } from './video_maker/videoBuilder.js';
import { uploadVideo } from './uploaders/uploadVideo.js';
import { uploadVideoToTiktok } from './uploaders/uploadVideoToTiktok.js';


const videoInstance = await buildVideo({
  subject: 'autos deportivos de la década de los 10s',
  listLength: 5,
  asyncItemsBuild: true,
});


// await uploadVideoToTiktok(videoInstance.videoPath, videoInstance.title, videoInstance.hashtags.map(hash => hash.replace('#', '')));
// await uploadVideo(videoInstance.masterVideoPath, videoInstance.title, videoInstance.fullDescription);
