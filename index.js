import 'dotenv/config'
import OpenAI from 'openai';
import fs from 'fs'
import path from 'path'
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createProjectDirectories } from './createDirectories.js';
import { generateAudio } from './generateAudio.js';
import { mergeAudioFiles } from './mergeAudioFiles.js';
import { generateImage } from './generateImage.js';
import { mergeMedia, mergeVideos } from './ffmpegMerger.js';
import { uploadVideo } from './uploadVideo.js';

const openai = new OpenAI();

const TOP_LIST_TITLE = 'Mejores futbolistas de la década de los 2010s';
const TOP_LIST_LENGTH = 3;

const PROJECT_PATH = `./.outputs/${TOP_LIST_TITLE}`;

const CONTEXT_MESSAGE = {role: 'user', content: `CONTEXT:\n\n

`};

createProjectDirectories(TOP_LIST_TITLE);

async function getVideoInfo(subject) {
  const functions = [{
    name: 'make_top_list_video',
    description: `Makes top ${TOP_LIST_LENGTH} video about the subject in Spanish`,
    "parameters": {
      "type": "object",
      "properties": {
        "title": {
          type: "string",
          description: 'The title of the video'
        },
        // "visual_style": {
        //   type: "string",
        //   description: 'The style in that the images in the video.'  
        // },
        // "narration_mood": {
        //   type: "string",
        //   description: 'The mood that the narration of the video'  
        // },
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
          "description": `the top ${TOP_LIST_LENGTH} to make the video about starting from lowest ranked (#${TOP_LIST_LENGTH}) ending with the highest (#1)`,
          "items": {
            "type": "string"
          },
        },
      },
    },
  }];

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Tema del top: ${subject}` },
      CONTEXT_MESSAGE
    ],
    model: 'gpt-4-0613',
    functions,
    function_call: 'auto'
  });

  const functionArgs = JSON.parse(completion.choices[0].message.function_call.arguments)

  if (functionArgs.items.length > TOP_LIST_LENGTH) {
    functionArgs.items.length = TOP_LIST_LENGTH;
  }

  return functionArgs;
}

async function getBody(title, subject, posisition) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Estoy haciendo un video sobre el top ${TOP_LIST_LENGTH} ${subject}. En el puesto ${posisition} está ${title}. Has una pequeña parte de la narración en español para el video sobre ${title}. Ten en cuenta que la lista contiene un total de ${TOP_LIST_LENGTH} posiciones y el video va desde la última posición hasta el primer puesto. El texto generado va a ser utilizado para generar el audio de la narración, por lo tanto es importante que no contenga anotaciones ni indicaciones.` },
      CONTEXT_MESSAGE,
    ],
    model: 'gpt-3.5-turbo',
  });

  return completion.choices[0].message.content;
}

async function getImagePrompt(text) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Create a short description (77 tokens max) in English for the following title (which is in Spanish): ${text}. The topic is ${TOP_LIST_TITLE}. The text will be used for a text-to-image model, so be descriptive` },
      CONTEXT_MESSAGE
    ],
    model: 'gpt-4-0613',
  });

  return completion.choices[0].message.content;
}

const numberNames = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

async function getItemsNarrations(topTitles) {
  return await Promise.all(topTitles.map(async (title, index) => {
    const positionName = numberNames[TOP_LIST_LENGTH - index - 1];
    let narratorText = `Puesto número ${positionName}: ${title}.\n\n`;

    narratorText += await getBody(title, TOP_LIST_TITLE, positionName);

    console.log(`🔊 Generating audio for "${narratorText}"`);
    const generateAudioRes = await generateAudio(narratorText, `${PROJECT_PATH}/audio`);

    return {
      title,
      narratorText,
      audioFiles: generateAudioRes.audio_files
    };
  }));
}

async function createItemVideo(item) {
  const outputPath = `${PROJECT_PATH}/videos/${item.title.split(' ').join('_')}.mov`
  item.outputVideo = outputPath;
  await mergeMedia(item, outputPath);
}

const videoInfo = await getVideoInfo(TOP_LIST_TITLE);
console.log('📝 Video info:', videoInfo);

videoInfo.items = await getItemsNarrations(videoInfo.items);

// Save array to JSON file
const outputDirectory = path.join(__dirname, `${PROJECT_PATH}`);
const filePath = path.join(outputDirectory, 'record.json');
fs.writeFile(filePath, JSON.stringify(videoInfo, null, 2), (err) => {
    if (err) {
        console.error(`Error writing file: ${err}`);
    } else {
        console.log(`File has been written to ${filePath}`);
    }
});

const flatAudios = videoInfo.items.reduce((acc, cur) => {
  return acc.concat(cur.audioFiles);
}, []);

const mergedAudiosPath = `./.outputs/Top ${TOP_LIST_LENGTH} ${TOP_LIST_TITLE}.wav`;
await mergeAudioFiles(flatAudios, mergedAudiosPath);

for (let item of videoInfo.items) {
  const {title} = item;
  item.images = [];
  const imageOutputPath = `${PROJECT_PATH}/images/${title}.png`
  console.log('📝🏞️ Generating prompt for image generation of', title);
  const imagePrompt = await getImagePrompt(title);
  console.log('🎆 Generating image for', title, 'with prompt', imagePrompt);
  await generateImage(imagePrompt, imageOutputPath);
  item.images.push(imageOutputPath)
}

fs.writeFile(filePath, JSON.stringify(videoInfo, null, 2), (err) => {
  if (err) {
      console.error(`Error writing file: ${err}`);
  } else {
      console.log(`File has been written to ${filePath}`);
  }
});


await Promise.all(videoInfo.items.map(createItemVideo));
const videoOutputPath = `./.outputs/TOP ${TOP_LIST_LENGTH} ${TOP_LIST_TITLE}.mov`
await mergeVideos(videoInfo.items.map(item => item.outputVideo), videoOutputPath);


const fullDescription = `${videoInfo.description}\n\n${videoInfo.hashtags.join(' ')}`;
await uploadVideo(videoOutputPath, videoInfo.title, fullDescription);