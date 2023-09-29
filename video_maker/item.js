import path from 'path'

import {
  getBody,
  getImagePrompt,
} from './generators/textGenerator.js';
import { generateAudio } from './generators/generateAudio.js';
import { generateImages, generateNumberImage } from './generators/generateImage.js';
import { mergeAudioFiles } from './utils/mergeAudioFiles.js';
import getVideoDuration from './utils/videoDuration.js';
import { renderRemotion } from './renderModule.js';


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

  async generateFullVideo({
    index,
    title,
    subject,
    listLength,
    outputDirectory,
    visualStyle,
    itemPosition,
  }) {
    await this.generateNarrationText(index, subject, listLength);
    await Promise.all([
      this.generateNarrationAudios(outputDirectory),
      this.generateImages(visualStyle, subject, outputDirectory, itemPosition),
    ]);
    await this.generateVideo(title, itemPosition, outputDirectory);
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

  async generateImages(visualStyle, listSubject, projectOuputhDir, itemPosition) {
    if (!projectOuputhDir) {
      throw `No projectOuputhDir set for generateImages`
    }

    if (this.images && this.images.length) {
      return;
    }

    this.images = [];
    const imageOutputPath = `${projectOuputhDir}/images`
    console.log('📝🏞️ Generating prompt for image generation of', this.title);
    const imagePrompts = await getImagePrompt(this.title, listSubject, visualStyle);
    console.log('Image prompts generated:', imagePrompts);
    
    if (itemPosition) {
      const positionImagePrompts = await getImagePrompt(this.title, listSubject);
      const positionNumberImage = await generateNumberImage(positionImagePrompts[0], itemPosition, imageOutputPath);
      this.images.push(positionNumberImage);
    }

    for (let imgPrompt of imagePrompts) {
      console.log('🎆 Generating image for', this.title, 'with prompt', imgPrompt);
      const images = await generateImages(imgPrompt, imageOutputPath);
      console.log('🎆 Saved image for', this.title, 'with prompt', imgPrompt, 'in', imageOutputPath);
      this.images.push(...images)
    }

    console.log(this.images)
  }

  async generateVideo(videoTitle, listItemPosition, projectOuputhDir) {
    if (this.outputVideo !== null) {
      return;
    }

    const outputPath = path.join(projectOuputhDir, `/videos/${this.sanitizedTitle}.mp4`);
    
    let titleText = listItemPosition ? `#${listItemPosition}: ${this.title}` : videoTitle;

    await renderRemotion(outputPath, {
      titleText,
      backgroundImages: this.images,
      audioTrack: this.audioTrack
    });
    this.duration = await getVideoDuration(outputPath);
    this.outputVideo = outputPath;
  }
}