import 'dotenv/config'
import { spawn } from 'child_process';
import Replicate from "replicate";
import fs from 'fs/promises';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});



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


async function generateNumberImage(prompt, number) {
  const numberImagePath = './eight.png'

  // Load the image and convert it to base64
  const image = await fs.readFile(numberImagePath, {encoding: 'base64'});
  const output = await replicate.run(
    "andreasjansson/illusion:75d51a73fce3c00de31ed9ab4358c73e8fc0f627dc8ce975818e653317cb919b",
    {
      input: {
        prompt,
        negative_prompt: 'ugly, disfigured, low quality, blurry, nsfw',
        num_inference_steps: 40,
        guidance_scale: 7.5,
        seed: -1,
        width: 1024,
        height: 1024,
        num_outputs: 1,
        image
      }
    }
  );

  console.log(output);
}



export { generateImage, generateNumberImage };
