import fs from 'fs'
import path from 'path'
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createProjectDirectories } from './createDirectories.js';
import {
  getVideoInfo,
  getBody,
  getImagePrompt, 
} from './textGenerator.js';
import { generateAudio } from './generateAudio.js';
import { generateImage } from './generateImage.js';
import { mergeMedia, mergeVideos, addVoiceOver } from './ffmpegMerger.js';
import { uploadVideo } from './uploadVideo.js';

const TOP_LIST_TITLE = 'Ciudades de México más felices';
const TOP_LIST_LENGTH = 3;
const PROJECT_PATH = `./.outputs/${TOP_LIST_TITLE}`;

createProjectDirectories(TOP_LIST_TITLE);

class Video {
  constructor(subject, listLength) {
    this.subject = subject;
    this.listLength = listLength

    this.title = null;
    this.description = null;
    this.items = null;
    this.hashtags = null;
  }

  async generateStructure() {
    const {title, description, items, hashtags} = await getVideoInfo(this.subject, this.listLength);
    this.title = title;
    this.description = description;
    this.hashtags = hashtags;
    this.items = items.map(itemTitle => new Item(itemTitle));
  }

  async generateNarrationAudio() {
    await Promise.all(this.items.map(async (itemInstance, index) => {
      await itemInstance.generateNarrationText(index);
      
      console.log(`🔊 Generating audio for "${itemInstance.narratorText}"`);
      await itemInstance.generateNarrationAudios();
      
      return itemInstance;
    }));
  }

  async generateItemsImages() {
    for (let item of this.items) {
      await item.generateImages();
    }
  }

  async createItemsVideos() {
    await Promise.all(this.items.map(item => item.generateVideo()));
  }

  updateRecord() {
    const outputDirectory = path.join(__dirname, `${PROJECT_PATH}`);
    const filePath = path.join(outputDirectory, 'record.json');
    fs.writeFile(filePath, JSON.stringify(this, null, 2), (err) => {
        if (err) {
            console.error(`Error writing file: ${err}`);
        } else {
            console.log(`File has been written to ${filePath}`);
        }
    });

  }
}

class Item {
  constructor(title) {
    this.title = title;
    this.narratorText = null;
    this.audioFiles = null;
    this.images = null;
    this.outputVideo = null;
  }

  async generateNarrationText(index) {
    const numberNames = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
    const positionName = numberNames[TOP_LIST_LENGTH - index - 1];

    this.narratorText = `Puesto número ${positionName}: ${this.title}.\n\n`;
    this.narratorText += await getBody(this.title, TOP_LIST_TITLE, positionName, TOP_LIST_LENGTH);
  }

  async generateNarrationAudios() {
    const generateAudioRes = await generateAudio(this.narratorText, `${PROJECT_PATH}/audio`);
    this.audioFiles = generateAudioRes.audio_files;
  }

  async generateImages() {
    this.images = [];
    const imageOutputPath = `${PROJECT_PATH}/images/${this.title}.png`
    console.log('📝🏞️ Generating prompt for image generation of', this.title);
    const imagePrompt = await getImagePrompt(this.title, TOP_LIST_TITLE);
    console.log('🎆 Generating image for', this.title, 'with prompt', imagePrompt);
    await generateImage(imagePrompt, imageOutputPath);
    this.images.push(imageOutputPath)
  }

  async generateVideo() {
    const outputPath = `${PROJECT_PATH}/videos/${this.title.split(' ').join('_')}.mov`
    this.outputVideo = outputPath;
    await mergeMedia(this.audioFiles, this.images, this.outputVideo);
  }
}

const videoInstance = new Video(TOP_LIST_TITLE, TOP_LIST_LENGTH);
await videoInstance.generateStructure();
console.log('📝 Video structure:', videoInstance);

videoInstance.updateRecord();
await videoInstance.generateNarrationAudio();
videoInstance.updateRecord();
await videoInstance.generateItemsImages()
videoInstance.updateRecord();
await videoInstance.createItemsVideos();
videoInstance.updateRecord();

let videoOutputPath = `./.outputs/TOP ${TOP_LIST_LENGTH} ${TOP_LIST_TITLE}.mov`.replaceAll(' ', '_');

console.log('Merging videos:', videoInstance);
await mergeVideos(videoInstance.items.map(item => item.outputVideo), videoOutputPath);
// videoOutputPath = await addVoiceOver(videoOutputPath, `./music/loop.mp3`);

console.log('📹 Full video generated:', videoOutputPath);

const fullDescription = `${videoInstance.description}\n\n${videoInstance.hashtags.join(' ')}`;

// await uploadVideo(videoOutputPath, videoInstance.title, fullDescription);