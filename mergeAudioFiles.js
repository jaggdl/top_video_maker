import fs from 'fs';
import { spawn } from 'child_process';

export const mergeAudioFiles = async (inputFiles, outputFile) => {
  return new Promise((resolve, reject) => {
    // Create a temporary text file and write the list of audio files to it.
    const tempFileName = 'temp.txt';
    const fileData = inputFiles.map(file => `file '${file}'`).join('\n');
    fs.writeFileSync(tempFileName, fileData);

    // Construct the FFMPEG command using the temp file.
    const ffmpegCommand = [
      '-y', // Overwrite output file without asking
      '-f', 'concat',
      '-safe', '0',
      '-i', tempFileName,
      '-acodec', 'copy',
      outputFile
    ];

    // Spawn the FFMPEG process
    const ffmpeg = spawn('ffmpeg', ffmpegCommand);

    // Handle process stdout
    ffmpeg.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    // Handle process stderr
    ffmpeg.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    // Handle process exit
    ffmpeg.on('close', (code) => {
      fs.unlinkSync(tempFileName); // Delete the temp file

      if (code === 0) {
        resolve(`FFMPEG process exited with code ${code}`);
      } else {
        reject(new Error(`FFMPEG process exited with code ${code}`));
      }
    });
  });
};
