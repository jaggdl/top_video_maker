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

const mergeAudioAndImages = async (audioPath, imagesArray, outputPath) => {
  return new Promise(async (resolve, reject) => {
    const command = ffmpeg();

    command.input(imagesArray[0]).loop();
    command.input(audioPath);
    command.outputOptions([
      '-c:v libx264',     // Codec for video
      '-c:a aac',         // Codec for audio
      '-strict experimental',
      '-shortest',        // Finish encoding when the shortest input stream ends
      '-pix_fmt yuv420p', // Pixel format, necessary for some players
    ])
    .output(outputPath)  // Output file path
    .on('end', () => {
      resolve('Video creation completed');
    })
    .on('error', (error) => {
      reject(`Error occurred: ${error.message}`);
    });

    command.run();
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
  const tempDir = path.join(__dirname, '../../out', `temp_${hash}`);
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
      .outputOptions([
        '-c copy',
      ])
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

function mergePairVideos(input1Path, input2Path, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(input1Path)
      .input(input2Path)
      .on('end', () => {
        console.log('Videos merged successfully.');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error:', err);
        reject(err);
      })
      .mergeToFile(outputPath);
  });
}

async function mixVideoAndAudio(videoFilePath, audioFilePath) {
  return new Promise(async (resolve, reject) => {
    const outputPath = path.join(
      path.dirname(videoFilePath),
      'output_' + path.basename(videoFilePath)
    );

    ffmpeg(videoFilePath)
      .input(audioFilePath)
      .audioBitrate('320k')
      .audioChannels(2)
      .complexFilter([
        '[0:a]volume=3.0[videoAudio]', // Raise video's audio volume by factor of 2
        '[1:a]volume=0.5[audioFile]', // Keep voice-over audio volume the same (can be adjusted)
        '[videoAudio][audioFile]amix=inputs=2:duration=first[aout]' // Mix both audio streams
      ])
      .outputOptions([
        '-map [aout]',
        '-map 0:v',
        '-strict -2',
        '-async 1'
      ])
      .output(outputPath)
      .on('error', (err) => {
        console.error('An error occurred: ' + err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('Merging finished !');
        resolve(outputPath);
      })
      .on('stderr', console.log)
      .run();
  });
}

export { mergeVideos, mixVideoAndAudio, mergeAudioAndImages, mergePairVideos };