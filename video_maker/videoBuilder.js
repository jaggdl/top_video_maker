import path from 'path';
import url from 'url';
import { Video } from './video.js';
import getRandomTrackLongerThan from './utils/randomTrackLongerThan.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildVideo({
  subject,
  listLength = 5,
  asyncItemsBuild = true
}) {
  const projectPath = `../out/${subject}`;
  const outputDirectory = path.join(__dirname, `${projectPath}`);
  const videoInstance = new Video(subject, listLength, outputDirectory);
  await videoInstance.generateStructure();
  
  if (asyncItemsBuild) {
    await videoInstance.generateItemsVideos();
  } else {
    // Both can be run async
    await Promise.all([
      videoInstance.generateNarrationAudio(),
      videoInstance.generateItemsImages()
    ]);
  
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

  return videoInstance;
};