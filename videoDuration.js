import { exec } from 'child_process';

const getVideoDuration = (inputPath) => {
  return new Promise((resolve, reject) => {
    const cmd = `ffprobe -i "${inputPath}" -show_entries format=duration -v quiet -of csv="p=0"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error}`);
        reject(error);
        return;
      }

      if (stderr) {
        console.error(`Stderr output: ${stderr}`);
        reject(new Error(stderr));
        return;
      }

      const duration = parseFloat(stdout);

      if (isNaN(duration)) {
        console.error("Could not retrieve video duration");
        reject(new Error("Could not retrieve video duration"));
        return;
      }

      resolve(duration);
    });
  });
};


export default getVideoDuration;
