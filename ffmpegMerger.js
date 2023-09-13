// mergeMedia.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateHash = (length = 8) => {
  return crypto.randomBytes(length).toString('hex');
};

const mergeMedia = async (item, finalOutputPath) => {
  if (!fs.existsSync(path.dirname(finalOutputPath))) {
    fs.mkdirSync(path.dirname(finalOutputPath), { recursive: true });
  }

  const { audioFiles: audios, images } = item;
  if (audios.length === 0 || images.length === 0) {
    throw new Error('Both audios and images should have at least one item.');
  }

  const hash = generateHash();
  const tempDir = path.join(__dirname, '.outputs', `temp_${hash}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const mergePromises = [];
  const tempFiles = [];

  for (let i = 0; i < audios.length; i++) {
    const audioPath = audios[i];
    const imagePath = images[i % images.length];
    const tempFileName = path.join(tempDir, `temp_${i}.mp4`);
    tempFiles.push(tempFileName);

    const mergePromise = new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .inputOptions(['-loop 1'])
        .input(audioPath)
        .outputOptions([
          '-c:v libx264',
          '-tune stillimage',
          '-c:a aac',
          '-b:a 192k',
          '-pix_fmt yuv420p',
          '-shortest'
        ])
        .output(tempFileName)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    mergePromises.push(mergePromise);
  }

  await Promise.all(mergePromises);

  const listFile = path.join(tempDir, 'files.txt');
  const listContent = tempFiles.map(file => `file '${file}'`).join('\n');
  fs.writeFileSync(listFile, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions('-c copy')
      .output(finalOutputPath)
      .on('end', () => {
        // Clean up temporary files and the list file
        tempFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(listFile);
        resolve();
      })
      .on('error', (err) => {
        // Clean up on error
        tempFiles.forEach((file) => fs.existsSync(file) && fs.unlinkSync(file));
        fs.existsSync(listFile) && fs.unlinkSync(listFile);
        reject(err);
      })
      .run();
  });
};

const mergeVideos = async (videoPaths, finalOutputPath) => {
  if (videoPaths.length === 0) {
    throw new Error('The videoPaths array should have at least one item.');
  }

  if (!fs.existsSync(path.dirname(finalOutputPath))) {
    fs.mkdirSync(path.dirname(finalOutputPath), { recursive: true });
  }

  const hash = generateHash();
  const tempDir = path.join(__dirname, '.outputs', `temp_${hash}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const listFile = path.join(tempDir, 'video_files.txt');

  // Convert to absolute paths and escape special characters
  const listContent = videoPaths.map(file => 
    `file '${path.resolve(file).replace(/'/g, "'\\''")}'`
  ).join('\n');

  fs.writeFileSync(listFile, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions('-c copy')
      .output(finalOutputPath)
      .on('end', () => {
        // Clean up the list file
        fs.unlinkSync(listFile);
        fs.rmdirSync(tempDir);
        resolve();
      })
      .on('error', (err) => {
        // Clean up on error
        fs.unlinkSync(listFile);
        fs.rmdirSync(tempDir);
        reject(err);
      })
      .run();
  });
};

export { mergeMedia, mergeVideos };