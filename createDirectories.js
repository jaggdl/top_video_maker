import fs from 'fs';
import path from 'path';

export function createProjectDirectories(projectDir) {
  const baseDir = './.outputs'
  const subDirs = ['audio', 'images', 'videos'];

  // Create the base directory if it doesn't exist
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }

  // Create the project directory
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir);
  }

  // Create sub-directories
  for (const dir of subDirs) {
    const subDirPath = path.join(projectDir, dir);
    if (!fs.existsSync(subDirPath)) {
      fs.mkdirSync(subDirPath);
    }
  }

  console.log(`Project directories created in ${projectDir}`);
}