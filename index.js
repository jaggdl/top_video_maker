import 'dotenv/config'
import OpenAI from 'openai';
import fs from 'fs'
import path from 'path'
import url from 'url';
import { spawn } from 'child_process';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createProjectDirectories } from './createDirectories.js';
import { generateAudio } from './generateAudio.js';
import { mergeAudioFiles } from './mergeAudioFiles.js';
import { generateImage } from './generateImage.js';

const openai = new OpenAI();

const TOP_10_TITLE = 'Las situaciones más embarrazosas que te pueden pasar en un avión';

const CONTEXT_MESSAGE = {role: 'user', content: `CONTEXT:\n\n

`};

createProjectDirectories(TOP_10_TITLE);

async function getTopTitles(subject) {
  const functions = [{
    name: 'make_top_10_video',
    description: 'Makes top 10 video about the subject in Spanish',
    "parameters": {
      "type": "object",
      "properties": {
        "title": {
          type: "string",
          description: 'The title of the video'
        },
        "description": {
          type: "string",
          description: 'The description of the video on Youtube'
        },
        "hashtags": {
          type: "array",
          description: 'the video #hashtags starting with a #',
          "items": {
            "type": "string"
          },
        },
        "items": {
          "type": "array",
          "description": "the top 10 to make the video about from highest ranked (#1) to lowest (#10)",
          "items": {
            "type": "string"
          },
        },
      },
    },
  }]
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Has un top 10 de ${subject}` },
      CONTEXT_MESSAGE
    ],
    model: 'gpt-4-0613',
    functions,
    function_call: 'auto'
  });

  const functionArgs = JSON.parse(completion.choices[0].message.function_call.arguments)

  if (functionArgs.items.length > 10) {
    functionArgs.items.length = 10;
  }

  console.log('Video info: ', functionArgs);


  return functionArgs.items;
}

async function getBody(title, subject, posisition) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Estoy haciendo un video sobre el top 10 ${subject}. En el puesto ${posisition} está ${title}. Has una pequeña parte del guión en español para el video sobre ${title} que incluya solamente el texto que va a ser leído por el narrador (sin espeficar en el texto que es para el narrador).` },
      CONTEXT_MESSAGE,
    ],
    model: 'gpt-3.5-turbo',
  });

  return completion.choices[0].message.content;
}

async function getImagePrompt(text) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Create a short description (77 tokens max) in English for the following title (which is in Spanish): ${text}. The topic is ${TOP_10_TITLE}. The text will be used for a text-to-image model, so be descriptive` },
      CONTEXT_MESSAGE
    ],
    model: 'gpt-4-0613',
  });

  return completion.choices[0].message.content;
}

const numberNames = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

async function getTopsBodies(topTitles) {
  const generatedAudios = await Promise.all(topTitles.map(async (title, index) => {
    const positionName = numberNames[index];
    let narratorText = `Puesto número ${positionName}: ${title}.\n\n`;

    narratorText += await getBody(title, TOP_10_TITLE, positionName);

    const generateAudioRes = await generateAudio(narratorText, `./.outputs/${TOP_10_TITLE}/audio`);

    return {
      title,
      audios: generateAudioRes.audio_files
    };
  }));

  for (let title of topTitles) {
    const imagePrompt = await getImagePrompt(title);
    console.log('Generating image for', title, 'with prompt', imagePrompt);
    const generateImageRes = await generateImage(imagePrompt, `./.outputs/${TOP_10_TITLE}/images/${title}.png`)
  }

  return generatedAudios;
}

const topTitles = await getTopTitles(TOP_10_TITLE);
const topsBodies = await getTopsBodies(topTitles, 3);

// Save array to JSON file
const outputDirectory = path.join(__dirname, `./.outputs/${TOP_10_TITLE}`);
const filePath = path.join(outputDirectory, 'record.json');
fs.writeFile(filePath, JSON.stringify(topsBodies, null, 2), (err) => {
    if (err) {
        console.error(`Error writing file: ${err}`);
    } else {
        console.log(`File has been written to ${filePath}`);
    }
});

const flatAudios = topsBodies.reverse().reduce((acc, cur) => {
  return acc.concat(cur.audios);
}, []);

console.log(flatAudios);

const mergedAudiosPath = `./.outputs/Top 10 ${TOP_10_TITLE}.wav`;

await mergeAudioFiles(flatAudios, mergedAudiosPath);

const ffmpegCommand = [
  '-y', // Overwrite output file without asking
  '-i', mergedAudiosPath,
  '-ar', '10050',
  mergedAudiosPath.replace('./', '/Users/j.a./Downloads/')
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