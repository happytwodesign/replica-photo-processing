import * as faceapi from 'face-api.js';
import path from 'path';
import { Canvas, Image } from 'canvas';

// Polyfill for faceapi in Node environment
faceapi.env.monkeyPatch({ Canvas, Image } as any);

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  const modelsPath = path.join(process.cwd(), 'src', 'models');
  try {
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
    modelsLoaded = true;
    console.log('Face-api models loaded successfully');
  } catch (error) {
    console.error('Error loading face-api models:', error);
    throw error;
  }
}
