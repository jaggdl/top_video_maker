import 'dotenv/config'
const SESSION_ID = process.env.TIKTOK_SESSION_ID;
import { spawn } from 'child_process';

const uploadVideoToTiktok = (file, title, tags, schedule_time) => {
  console.log('Uploading to TikTok:', file, title, tags, schedule_time)
  return new Promise((resolve, reject) => {
    const pyProcess = spawn('python', [
      'py_scripts/tiktok_uploader.py',
      '-i', SESSION_ID,
      '-p', file,
      '-t', title,
      '--tags', tags.join(' ')
    ]);

    let dataString = '';
    pyProcess.stdout.on('data', (data) => {
      console.log(data.toString())
      dataString += data.toString();
    });
    
    pyProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Exited with ${code}`));
      }
      return resolve();
    });
  });
}

export { uploadVideoToTiktok };