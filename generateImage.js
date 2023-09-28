import 'dotenv/config';
import { spawn } from 'child_process';
import Replicate from "replicate";
import fs from 'fs/promises';
import fetch from 'node-fetch';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});


const generateImage = async (prompt, outputPath) => {
  const imagesUrls = await replicate.run(
    "stability-ai/sdxl:728f6fcbe9b1b61804886c971f5924a41b7fcc5ca05004aa2a636c636a941575",
    {
      input: {
        prompt
      }
    }
  );

  await saveImageFromUrl(imagesUrls[0], outputPath);
};

async function generateNumberImage(prompt, number, outputPath) {
  const numberImagePath = './eight.png'

  // Load the image and convert it to base64
  const base64Image = await fs.readFile(numberImagePath, {encoding: 'base64'});
  const imageUri = `data:image/gif;base64,${base64Image}`
  const imagesUrls = await replicate.run(
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
        image: imageUri,
        qr_code_content: '',
      }
    }
  );

  await saveImageFromUrl(imagesUrls[0], outputPath);
}

async function saveImageFromUrl(url, outputPath) {
  const response = await fetch(url);
    
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const buffer = await response.buffer();
  
  await fs.writeFile(outputPath, buffer);
}



export { generateImage, generateNumberImage };
