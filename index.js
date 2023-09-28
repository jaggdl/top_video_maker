import path from 'path'
import url from 'url';
import { Video } from './video_maker/video.js'

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import getRandomTrackLongerThan from './randomTrackLongerThan.js'
import { uploadVideo } from './uploadVideo.js';
import { uploadVideoToTiktok } from './uploadVideoToTiktok.js';

const TOP_LIST_TITLE = 'Canciones en español con historias tristes';
const TOP_LIST_LENGTH = 3;
const PROJECT_PATH = `./.outputs/${TOP_LIST_TITLE}`;
const outputDirectory = path.join(__dirname, `${PROJECT_PATH}`);

const videoInstance = new Video(TOP_LIST_TITLE, TOP_LIST_LENGTH, outputDirectory);
await videoInstance.generateStructure();

// Both can be run async
await Promise.all([
  videoInstance.generateNarrationAudio(),
  videoInstance.generateItemsImages()
])

await videoInstance.createItemsVideos({
  concurrentItems: Math.ceil(videoInstance.items.length / 2)
});
await videoInstance.mergeItemsVideos();

const videoMusicTrack = await getRandomTrackLongerThan(videoInstance.totalDuration);
console.log('Adding music track:', videoMusicTrack);
await videoInstance.mixAudioIntoVideo(videoMusicTrack);
console.log('📹 Master video generated:', videoInstance.masterVideoPath);

console.log(videoInstance.fullDescription); 

const absoluteVideoPath = path.join(__dirname, videoInstance.videoPath);
// await uploadVideoToTiktok(absoluteVideoPath, videoInstance.title, videoInstance.hashtags.map(hash => hash.replace('#', '')));
// await uploadVideo(videoInstance.masterVideoPath, videoInstance.title, videoInstance.fullDescription);
