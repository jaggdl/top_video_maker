import 'dotenv/config';
import Replicate from "replicate";
import fs from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});


const generateImages = async (prompt, outputPath, numberOfImages = 2, dimensions) => {
  const imagesUrls = await replicate.run(
    "stability-ai/sdxl:af1a68a271597604546c09c64aabcd7782c114a63539a4a8d14d1eeda5630c33",
    {
      input: {
        prompt,
        num_outputs: numberOfImages,
        ...dimensions
      }
    }
  );

  const imageFilesPaths = Promise.all(imagesUrls.map(async (url, index) => {
    const sanitizedPrompt = sanitizeFileName(prompt);
    const imageFilePath = path.join(outputPath, `${sanitizedPrompt}_${index}.png`);
    await saveImageFromUrl(url, imageFilePath);
    return imageFilePath;
  }))

  return imageFilesPaths;

};

function sanitizeFileName(fileName) {
  // Remove characters that are not numbers or letters
  fileName = fileName.replace(/[^a-zA-Z0-9]/g, '');

  // Replace spaces with underscores
  fileName = fileName.replace(/\s+/g, '_');

  // Truncate to the maximum file name length
  return fileName.slice(0, 255);
}

async function generateNumberImage(prompt, number, outputPath, dimensions) {
  const numberImagePath = path.join(__dirname, `../../assets/${number}.png`);

  const sanitizedPrompt = sanitizeFileName(prompt);
  const imageFilePath = path.join(outputPath, `${number}_${sanitizedPrompt}.png`);

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
        ...dimensions,
        num_outputs: 1,
        image: imageUri,
        qr_code_content: '',
        controlnet_conditioning_scale: 1,
      }
    }
  );

  await saveImageFromUrl(imagesUrls[0], imageFilePath);

  return imageFilePath;
}

async function saveImageFromUrl(url, outputPath) {
  const response = await fetch(url);
    
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const buffer = await response.buffer();
  
  await fs.writeFile(outputPath, buffer);
}



export { generateImages, generateNumberImage };
