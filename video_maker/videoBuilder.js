import path from 'path';
import url from 'url';
import { Video } from './video.js';
import getRandomTrackLongerThan from './utils/randomTrackLongerThan.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildVideo({
  subject,
  listLength = 5,
  formats = [
    [1024, 1024]
  ]
}) {

  if (!subject) {
    throw Error('Subject is required');
  }

  const projectPath = `../out/${subject}`;
  const outputDirectory = path.join(__dirname, `${projectPath}`);
  const videoInstance = new Video(subject, listLength, outputDirectory);
  await videoInstance.generateStructure();


  for (let format of formats) {

    let dimensions = {
      width: format[0],
      height: format[1],
    }
    // Both can be run async
    await Promise.all([
      videoInstance.generateNarrationAudio(),
      videoInstance.generateItemsImages(dimensions)
    ]);

    await videoInstance.createItemsVideos({
      concurrentItems: 1,
      dimensions
    });

    await videoInstance.mergeItemsVideos();
  }
  
  const videoMusicTrack = await getRandomTrackLongerThan(videoInstance.totalDuration);
  console.log('Adding music track:', videoMusicTrack);
  await videoInstance.mixAudioIntoVideo(videoMusicTrack);
  console.log('📹 Master video generated:', videoInstance.masterVideoPath);
  
  console.log(videoInstance.fullDescription);

  return videoInstance;
};