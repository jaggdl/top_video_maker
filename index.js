import path from 'path'
import url from 'url';
import { Video } from './video_maker/video.js'
import getRandomTrackLongerThan from './video_maker/utils/randomTrackLongerThan.js'
import { uploadVideo } from './uploaders/uploadVideo.js';
import { uploadVideoToTiktok } from './uploaders/uploadVideoToTiktok.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const TOP_LIST_TITLE = 'autos deportivos de la década de los 00s';
const TOP_LIST_LENGTH = 5;
const PROJECT_PATH = `./out/${TOP_LIST_TITLE}`;
const outputDirectory = path.join(__dirname, `${PROJECT_PATH}`);
const generateItemsAsync = true;

const videoInstance = new Video(TOP_LIST_TITLE, TOP_LIST_LENGTH, outputDirectory);
await videoInstance.generateStructure();

if (generateItemsAsync) {
  await videoInstance.generateItemsVideos();
} else {
  // Both can be run async
  await Promise.all([
    videoInstance.generateNarrationAudio(),
    videoInstance.generateItemsImages()
  ])

  await videoInstance.createItemsVideos({
    concurrentItems: Math.ceil(videoInstance.items.length / 2)
  });
}


await videoInstance.mergeItemsVideos();

const videoMusicTrack = await getRandomTrackLongerThan(videoInstance.totalDuration);
console.log('Adding music track:', videoMusicTrack);
await videoInstance.mixAudioIntoVideo(videoMusicTrack);
console.log('📹 Master video generated:', videoInstance.masterVideoPath);

console.log(videoInstance.fullDescription); 

// await uploadVideoToTiktok(videoInstance.videoPath, videoInstance.title, videoInstance.hashtags.map(hash => hash.replace('#', '')));
// await uploadVideo(videoInstance.masterVideoPath, videoInstance.title, videoInstance.fullDescription);
