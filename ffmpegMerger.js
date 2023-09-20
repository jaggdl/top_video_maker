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

const resampleAudio = async (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .audioFrequency(44100)  // Resample to 44100 Hz
      .audioChannels(2)  // Convert to stereo if it's not
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
};

const getAudioDuration = (audioPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const audioDuration = metadata.format.duration;
      resolve(audioDuration);
    });
  });
};

const mergeAudioAndImages = async (audioPath, imagesArray, outputPath) => {
  return new Promise(async (resolve, reject) => {
    // Create an FFmpeg command
    const command = ffmpeg();

    // Set the input image
    command.input(imagesArray[0]).loop();

    // Set the input audio
    command.input(audioPath);

    // Set the output options
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

    // Run the FFmpeg command
    command.run();
  });
};


const mergeMedia = async (audios, images, finalOutputPath) => {
  if (!fs.existsSync(path.dirname(finalOutputPath))) {
    fs.mkdirSync(path.dirname(finalOutputPath), { recursive: true });
  }

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
  const resampledAudios = [];
  
  for (let i = 0; i < audios.length; i++) {
    const originalAudioPath = audios[i];
    const resampledAudioPath = path.join(tempDir, `resampled_${i}.wav`);
    resampledAudios.push(resampledAudioPath);
    
    await resampleAudio(originalAudioPath, resampledAudioPath);
  }
  
  for (let i = 0; i < resampledAudios.length; i++) {
    const audioPath = resampledAudios[i];
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
          '-ar 44100', // Now it's 44100 Hz
          '-ac 2',  // Stereo audio
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

async function getVideoDurationInSeconds(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, function(err, metadata) {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration);
    });
  });
}

async function addVoiceOver(videoFilePath, audioFilePath) {
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
        '[0:a][1:a]amix=inputs=2:duration=first[aout]'
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


export { mergeMedia, mergeVideos, addVoiceOver, mergeAudioAndImages };