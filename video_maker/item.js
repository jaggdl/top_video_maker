import path from 'path'
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  getBody,
  getImagePrompt,
} from '../textGenerator.js';
import { generateAudio } from '../generateAudio.js';
import { generateImage, generateNumberImage } from '../generateImage.js';
import { mergeAudioFiles } from '../mergeAudioFiles.js';
import getVideoDuration from '../videoDuration.js';
import { renderRemotion } from '../renderModule.js';


export class Item {
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
    // Remove non-alphanumeric characters using regex
    const alphanumericTitle = this.title.replace(/[^a-zA-Z0-9 ]/g, '');
  
    // Replace spaces with underscores
    const underscoreTitle = alphanumericTitle.split(' ').join('_');
  
    // Limit the length to 50 characters
    const limitedTitle = underscoreTitle.substring(0, 50);
  
    return limitedTitle;
  }

  async generateNarrationText(index, listSubject, listLength) {
    const numberNames = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
    const positionName = numberNames[listLength - index - 1];

    if (this.narratorText) {
      return;
    }

    const generatedNarration = await getBody(this.title, listSubject, positionName, listLength);
    this.narratorText = `Puesto número ${positionName}: ${this.title}.\n${generatedNarration}`;
  }

  async generateNarrationAudios(projectOuputhDir) {
    const audioTrackPath = `${projectOuputhDir}/audio/track_${this.sanitizedTitle}.wav`;

    if (this.audioFiles && this.audioTrack) {
      return;
    }

    if (!this.audioFiles) {
      console.log(`🔊 Generating audio for "${this.narratorText}"`);
      const generateAudioRes = await generateAudio(this.narratorText, `${projectOuputhDir}/audio`);
      this.audioFiles = generateAudioRes.audio_files;
    }

    await mergeAudioFiles(this.audioFiles, audioTrackPath);
    this.audioTrack = audioTrackPath
  }

  async generateImages(visualStyle, listSubject, projectOuputhDir) {
    if (this.images) {
      return;
    }

    this.images = [];
    const imageOutputPath = `${projectOuputhDir}/images/${this.sanitizedTitle}.png`
    console.log('📝🏞️ Generating prompt for image generation of', this.title);
    const imagePrompts = await getImagePrompt(this.title, listSubject, visualStyle);
    console.log('Image prompts generated:', imagePrompts);

    for (let imgPrompt of imagePrompts) {
      console.log('🎆 Generating image for', this.title, 'with prompt', imgPrompt);
      await generateImage(imgPrompt, imageOutputPath);
      console.log('🎆 Saved image for', this.title, 'with prompt', imgPrompt, 'in', imageOutputPath);
      this.images.push(imageOutputPath)
    }
  }

  async generateVideo(videoTitle, listItemPosition, projectOuputhDir) {
    if (this.outputVideo !== null) {
      return;
    }

    const outputPath = path.join(projectOuputhDir, `/videos/${this.sanitizedTitle}.mp4`);
    
    let titleText = listItemPosition ? `#${listItemPosition}: ${this.title}` : videoTitle;

    await renderRemotion(outputPath, {
      titleText,
      backgroundImage: this.images[0],
      audioTrack: this.audioTrack
    });
    this.duration = await getVideoDuration(outputPath);
    this.outputVideo = outputPath;
  }
}