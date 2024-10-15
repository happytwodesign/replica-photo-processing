import sharp from 'sharp';
import * as faceapi from 'face-api.js';
import { Canvas, Image, loadImage } from 'canvas';

// Polyfill for faceapi in Node environment
faceapi.env.monkeyPatch({ Canvas, Image } as any);

export async function processPhoto(photoBuffer: Buffer, config: any): Promise<string> {
  try {
    console.log('Starting photo processing');
    let image = sharp(photoBuffer);
    
    // Get image metadata
    const metadata = await image.metadata();
    const originalWidth = metadata.width!;
    const originalHeight = metadata.height!;
    console.log(`Original image size: ${originalWidth}x${originalHeight}`);

    // Calculate initial resize dimensions
    const aspectRatio = 35 / 45;
    let resizeWidth, resizeHeight;
    if (originalWidth / originalHeight > aspectRatio) {
      resizeHeight = Math.max(450, originalHeight);
      resizeWidth = Math.round(resizeHeight * aspectRatio);
    } else {
      resizeWidth = Math.max(350, originalWidth);
      resizeHeight = Math.round(resizeWidth / aspectRatio);
    }

    console.log(`Step 1: Resizing image to 35:45 ratio (${resizeWidth}x${resizeHeight})`);
    image = image.resize(resizeWidth, resizeHeight, { fit: 'cover' });

    console.log('Step 2: Detecting face');
    const inputBuffer = await image.toBuffer();
    const img = await loadImage(inputBuffer);
    const detections = await faceapi.detectSingleFace(img as any).withFaceLandmarks();

    if (detections) {
      console.log('Face detected. Adjusting image...');
      const faceBox = detections.detection.box;
      console.log(`Face box: x=${faceBox.x}, y=${faceBox.y}, width=${faceBox.width}, height=${faceBox.height}`);
      
      const faceHeight = faceBox.height;
      const estimatedHeadHeight = faceHeight * 1.5;
      console.log(`Estimated head height: ${estimatedHeadHeight}`);
      
      // Adjust scale factor to make head height 70% of image height
      const scaleFactor = (resizeHeight * 0.7) / estimatedHeadHeight;
      console.log(`Scale factor: ${scaleFactor}`);
      
      const newWidth = Math.round(resizeWidth * scaleFactor);
      const newHeight = Math.round(resizeHeight * scaleFactor);
      console.log(`New dimensions after scaling: ${newWidth}x${newHeight}`);
      
      const centerX = faceBox.x + faceBox.width / 2;
      const centerY = faceBox.y + faceBox.height / 2;
      let cropLeft = Math.max(0, Math.round(centerX * scaleFactor - 350 / 2));
      let cropTop = Math.max(0, Math.round(centerY * scaleFactor - 450 * 0.4)); // Position face slightly above center
      
      // Ensure crop area is within bounds
      cropLeft = Math.min(cropLeft, newWidth - 350);
      cropTop = Math.min(cropTop, newHeight - 450);
      
      console.log(`Crop box: left=${cropLeft}, top=${cropTop}, width=350, height=450`);
      
      image = image.resize(newWidth, newHeight);
      
      // Only extract if the crop area is valid
      if (cropLeft >= 0 && cropTop >= 0 && cropLeft + 350 <= newWidth && cropTop + 450 <= newHeight) {
        image = image.extract({ 
          left: cropLeft,
          top: cropTop,
          width: 350,
          height: 450 
        });
      } else {
        console.warn('Invalid crop area. Falling back to center crop.');
        image = image.resize(350, 450, { fit: 'cover' });
      }
    } else {
      console.warn('No face detected. Proceeding with center crop.');
      image = image.resize(350, 450, { fit: 'cover' });
    }

    console.log('Final image size: 350x450');

    const processedBuffer = await image.toBuffer();
    console.log('Photo processing completed successfully');
    return processedBuffer.toString('base64');
  } catch (error) {
    console.error('Error in processPhoto:', error);
    // Log the full error stack trace
    if (error instanceof Error) {
      console.error(error.stack);
    }
    throw error;
  }
}
