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
import { mergeAudioFiles } from './mergeAudioFiles.js';
import getVideoDuration from './videoDuration.js';
import { mergeMedia, mergeVideos, addVoiceOver, mergeAudioAndImages } from './ffmpegMerger.js';
import { uploadVideo } from './uploadVideo.js';

const TOP_LIST_TITLE = 'Ciudades costeras más chill de México 🤙';
const TOP_LIST_LENGTH = 5;
const PROJECT_PATH = `./.outputs/${TOP_LIST_TITLE}`;

createProjectDirectories(TOP_LIST_TITLE);

class Video {
  constructor(subject, listLength) {
    this.subject = subject;
    this.listLength = listLength;
    this.title = null;
    this.description = null;
    this.items = null;
    this.hashtags = null;
    this.visualStyle = null;

    const videoRecord = this.readJSONFileSync(this.recordPath);

    if (videoRecord) {
      this.title = videoRecord.title;
      this.description = videoRecord.description;
      this.items = videoRecord.items.map(itemRecord => new Item(itemRecord));
      this.hashtags = videoRecord.hashtags;
      this.visualStyle = videoRecord.visualStyle;
    }
  }

  get recordPath() {
    const outputDirectory = path.join(__dirname, `${PROJECT_PATH}`);
    return path.join(outputDirectory, 'record.json');
  }

  readJSONFileSync(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (err) {
      console.error(`Error reading or parsing file: ${err}`);
      return null;
    }
  }

  async generateStructure() {
    if (this.items) {
      return;
    }

    const {title, description, items, hashtags, visual_style} = await getVideoInfo(this.subject, this.listLength);
    this.title = title;
    this.description = description;
    this.hashtags = hashtags;
    this.visualStyle = visual_style;
    this.items = items.map(itemTitle => new Item({title: itemTitle}));
    this.updateRecord();
  }

  async generateNarrationAudio() {
    await Promise.all(this.items.map(async (itemInstance, index) => {
      await itemInstance.generateNarrationText(index);
      this.updateRecord();
      await itemInstance.generateNarrationAudios();
    
      this.updateRecord();
    }));
  }

  async generateItemsImages() {
    for (let item of this.items) {
      await item.generateImages(this.visualStyle);
      this.updateRecord();
    }
  }

  async createItemsVideos() {
    await Promise.all(this.items.map(item => item.generateVideo()));
    this.updateRecord();
  }

  updateRecord() {
    fs.writeFileSync(this.recordPath, JSON.stringify(this, null, 2));
  }

  getformatedChapters() {
    let accumulatedTime = 0; // Initialize accumulated time to 0
    return this.items.map(item => {
      const minutes = Math.floor(accumulatedTime / 60); // Calculate minutes
      const seconds = Math.round(accumulatedTime % 60); // Calculate seconds
      const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; // Format time as MM:SS
      
      // Update the accumulated time for the next iteration
      accumulatedTime += item.duration;
      
      return `${formattedTime} - ${item.title}`; // Return the formatted string for this item
    }).join('\n'); // Join all formatted strings with a newline character
  }
  
}

class Item {
  constructor({title, narratorText, audioFiles, audioTrack, images, outputVideo, duration}) {
    this.title = title;
    this.narratorText = narratorText || null;
    this.audioFiles = audioFiles || null;
    this.audioTrack = audioTrack || null;
    this.images = images || null;
    this.outputVideo = outputVideo || null;
    this.duration = duration || null;
  }

  get sanitizedTitle() {
    return this.title.split(' ').join('_');
  }

  async generateNarrationText(index) {
    const numberNames = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
    const positionName = numberNames[TOP_LIST_LENGTH - index - 1];

    if (this.narratorText) {
      return;
    }

    const generatedNarration = await getBody(this.title, TOP_LIST_TITLE, positionName, TOP_LIST_LENGTH);
    this.narratorText = `Puesto número ${positionName}: ${this.title}.\n${generatedNarration}`;
  }

  async generateNarrationAudios() {
    const audioTrackPath = `${PROJECT_PATH}/audio/track_${this.sanitizedTitle}.wav`;

    if (this.audioFiles && this.audioTrack) {
      return;
    }

    if (!this.audioFiles) {
      console.log(`🔊 Generating audio for "${this.narratorText}"`);
      const generateAudioRes = await generateAudio(this.narratorText, `${PROJECT_PATH}/audio`);
      this.audioFiles = generateAudioRes.audio_files;
    }

    await mergeAudioFiles(this.audioFiles, audioTrackPath);
    this.audioTrack = audioTrackPath
  }

  async generateImages(visualStyle) {
    if (this.images) {
      return;
    }

    this.images = [];
    const imageOutputPath = `${PROJECT_PATH}/images/${this.title}.png`
    console.log('📝🏞️ Generating prompt for image generation of', this.title);
    const imagePrompts = await getImagePrompt(this.title, TOP_LIST_TITLE, visualStyle);
    console.log('Image prompts generated:', imagePrompts);

    for (let imgPrompt of imagePrompts) {
      console.log('🎆 Generating image for', this.title, 'with prompt', imgPrompt);
      await generateImage(imgPrompt, imageOutputPath);
      this.images.push(imageOutputPath)
    }
  }

  async generateVideo() {
    const outputPath = `${PROJECT_PATH}/videos/${this.sanitizedTitle}.mp4`
    await mergeAudioAndImages(this.audioTrack, this.images, this.outputVideo);
    this.duration = await getVideoDuration(outputPath);
    this.outputVideo = outputPath;
  }
}


const videoInstance = new Video(TOP_LIST_TITLE, TOP_LIST_LENGTH);
await videoInstance.generateStructure();
console.log('📝 Video structure:', videoInstance);

await videoInstance.generateNarrationAudio();
await videoInstance.generateItemsImages()
await videoInstance.createItemsVideos();

let videoOutputPath = `./.outputs/TOP ${TOP_LIST_LENGTH} ${TOP_LIST_TITLE}.mp4`.replaceAll(' ', '_');

console.log('Merging videos:', videoInstance);
await mergeVideos(videoInstance.items.map(item => item.outputVideo), videoOutputPath);
// videoOutputPath = await addVoiceOver(videoOutputPath, `./music/loop.mp3`);

console.log('📹 Full video generated:', videoOutputPath);

const fullDescription = `${videoInstance.description}\n\n${videoInstance.hashtags.join(' ')}\n\n${videoInstance.getformatedChapters()}`;

console.log(fullDescription);  

// await uploadVideo(videoOutputPath, videoInstance.title, fullDescription);
