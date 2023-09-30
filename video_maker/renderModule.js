import { spawn } from 'child_process';
import { basename, join } from 'path';
import { promises as fs } from 'fs';

export async function renderRemotion(outputPath, propsObject) {
  propsObject = JSON.parse(JSON.stringify(propsObject));
  return new Promise(async (resolve, reject) => {
    await prepareAssets(propsObject);

    const propsString = JSON.stringify(propsObject);

    const command = 'npx';
    const args = ['remotion', 
      'render', 'HelloWorld', 
      outputPath, 
      '--props', propsString,
      '--gl', 'angle'
    ];

    const child = spawn(command, args, {
      cwd: process.env.VIDEO_RENDERER_PATH, // specify the current working directory for the command
    });

    child.stdout.on('data', (data) => {
      // console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
      console.error(`${data}`);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`Execution Error: Process exited with code ${code}`);
        reject(new Error(`Process exited with code ${code}`)); // reject the promise if there is an error
      } else {
        resolve(); // resolve the promise if the process exits normally
      }
    });
  });
}



async function prepareAssets(propsObject) {
  await Promise.all([
    'backgroundImages',
    'audioTrack'
  ].map(async key => {
    const propValue = propsObject[key];

    if (Array.isArray(propValue)) {
      return Promise.all(propValue.map((propItem, index) => copyFileAndUpdatePath(propValue, index)));
    }

    await copyFileAndUpdatePath(propsObject, key);
  }));
}

async function copyFileAndUpdatePath(propsObject, key) {
  const oldPath = propsObject[key];
  const newDir = `${process.env.VIDEO_RENDERER_PATH}/public`;
  const filename = basename(oldPath);

  propsObject[key] = filename;
  
  const newPath = join(newDir, filename);

  // Move the image file to the new directory
  try {
    await fs.copyFile(oldPath, newPath);
    console.log(`File moved to ${newPath}`);
  } catch (error) {
    console.error(`Failed to move file: ${error}`);
    return;
  }
}