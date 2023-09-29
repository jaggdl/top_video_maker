import fs from 'fs'
import path from 'path'
import { Item } from './item.js'

import { createProjectDirectories } from './utils/createDirectories.js';
import {
  getVideoInfo,
  getVideoIntro,
  getVideoOutro,
} from './generators/textGenerator.js';
import { mergeVideos, mixVideoAndAudio } from './utils/ffmpegMerger.js';

export class Video {
  constructor(subject, listLength, outputDirectory) {
    this.subject = subject;
    this.listLength = listLength;
    this.outputDirectory = outputDirectory;

    this.title = null;
    this.description = null;
    this.items = null;
    this.hashtags = null;
    this.visualStyle = null;
    this.videoPath = null;
    this.masterVideoPath = null;

    const videoRecord = this.readJSONFileSync(this.recordPath);

    if (videoRecord) {
      this.#setRecord(videoRecord);
    }

    createProjectDirectories(this.outputDirectory);
  }

  get recordPath() {
    return path.join(this.outputDirectory, 'record.json');
  }

  get totalDuration() {
    if (this.items === null) {
      return 0;
    }
  
    return this.items.reduce((total, item) => {
      return total + item.duration;
    }, 0);
  }

  get listItems() {
    return this.items.filter(item => {
      return item.title !== 'Intro' && item.title !== 'Outro';
    })
  }

  get fullDescription() {
    const fullDescription = `${this.description}\n\n${this.getformatedChapters()}\n\n${this.hashtags.join(' ')}`;
    return fullDescription;
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
    if (this.items !== null) {
      return;
    }

    const [videoRecord, introduction, outro] = await Promise.all([
      getVideoInfo(this.subject, this.listLength),
      getVideoIntro({subject: this.subject, listLength: this.listLength}),
      getVideoOutro({subject: this.subject, listLength: this.listLength}),
    ]);
    
    videoRecord.items = videoRecord.items.map(title => {
      return { title };
    });

    this.#setRecord(videoRecord);

    this.items.unshift(new Item({
      title: 'Intro',
      narratorText: introduction,
    }));
    this.items.push(new Item({
      title: 'Outro',
      narratorText: outro,
    }));

    await this.generateNarrationText();
  }

  async generateNarrationText() {
    await Promise.all(this.listItems.map(async (itemInstance, index) => {
      await itemInstance.generateNarrationText(index, this.subject, this.listLength);
      this.updateRecord();
    }));
  }

  async generateNarrationAudio() {
    await Promise.all(this.items.map(async (itemInstance, index) => {
      await itemInstance.generateNarrationAudios(this.outputDirectory);
      this.updateRecord();
    }));
  }

  async generateItemsImages() {
    await Promise.all(this.items.map(async item => {
      const itemPosition = this.getListItemPosition(item);
      await item.generateImages(this.visualStyle, this.subject, this.outputDirectory, itemPosition);
      this.updateRecord();
    }));
  }

  async generateItemsVideos() {
    await Promise.all(this.items.map(async (item, index) => {
      const itemPosition = this.getListItemPosition(item);
      await item.generateFullVideo({
        index,
        subject: this.subject,
        listLength: this.listLength,
        outputDirectory: this.outputDirectory,
        visualStyle: this.visualStyle,
        title: this.title,
        itemPosition
      });
      this.updateRecord();
    }));
  }

  async createItemsVideos({concurrentItems = this.items.length}) {
    for (let i = 0; i < this.items.length; i += concurrentItems) {
      const promises = [];
      for (let j = 0; j < concurrentItems && i + j < this.items.length; j++) {
        const item = this.items[i + j];
        const itemPosition = this.getListItemPosition(item);
        promises.push(item.generateVideo(this.title, itemPosition, this.outputDirectory).then(() => {
          this.updateRecord();
        }));
      }
      await Promise.all(promises);
    }
  }
  

  getListItemPosition(item) {
    const index = this.listItems.indexOf(item);

    if (index !== -1) {
      return this.listItems.length - index;
    }

    return null
  }

  updateRecord() {
    fs.writeFileSync(this.recordPath, JSON.stringify(this, null, 2));
  }

  getformatedChapters() {
    let accumulatedTime = 0; // Initialize accumulated time to 0
    return this.items.map((item, i) => {
      const minutes = Math.floor(accumulatedTime / 60); // Calculate minutes
      const seconds = Math.floor(accumulatedTime % 60); // Calculate seconds
      const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; // Format time as MM:SS
      
      // Update the accumulated time for the next iteration
      accumulatedTime += item.duration;

      const position = this.listItems.includes(item) ? `#${this.getListItemPosition(item)}: ` : '';

      return `${formattedTime} - ${position}${item.title}`; // Return the formatted string for this item
    }).join('\n'); // Join all formatted strings with a newline character
  }

  async mergeItemsVideos() {
    const videoOutputPath = path.join(this.outputDirectory, 'full_video.mp4');
    await mergeVideos(this.items.map(item => item.outputVideo), videoOutputPath);
    this.videoPath = videoOutputPath;
  }

  async mixAudioIntoVideo(audioPath) {
    if (this.masterVideoPath) {
      return;
    }
    const videoOutputPath = await mixVideoAndAudio(this.videoPath, audioPath);
    this.masterVideoPath = videoOutputPath
    this.updateRecord();
  }

  #setRecord({title, description, items, hashtags, visualStyle, videoPath, masterVideoPath}) {
    this.title = title;
    this.description = description;
    this.hashtags = hashtags;
    this.visualStyle = visualStyle;
    this.items = items.map(item => new Item(item));  
    this.videoPath = videoPath || null;
    this.masterVideoPath = masterVideoPath || null ;
  }
}
