import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function getRandomTrackLongerThan(seconds) {
  const musicDir = path.join(__dirname, './music');
  const files = fs.readdirSync(musicDir);
  const tracks = [];

  for (const file of files) {
    const filePath = path.join(musicDir, file);
    const metadata = await parseFile(filePath);
    const duration = metadata.format.duration;

    if (duration > seconds) {
      tracks.push(filePath);
    }
  }

  const randomIndex = Math.floor(Math.random() * tracks.length);
  return tracks[randomIndex];
}
