import { spawn } from 'child_process';

const generateAudio = (text, outputDirectory) => {
  return new Promise((resolve, reject) => {
    const pyProcess = spawn('python', ['py_scripts/generate_tts_audio.py', text, outputDirectory]);
    
    let dataString = '';
    pyProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    pyProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Exited with ${code}`));
      }
      return resolve(JSON.parse(dataString));
    });
  });
};

export { generateAudio };
