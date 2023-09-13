import { spawn } from 'child_process';

const generateImage = (prompt, outputPath) => {
  return new Promise((resolve, reject) => {
    const pyProcess = spawn('python', ['stable_diffusion.py', prompt, outputPath]);
    
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
      return resolve();
    });
  });
};

export { generateImage };
