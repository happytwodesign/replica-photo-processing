import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { processPhoto } from './processPhoto';
import { loadModels } from './loadModels';
import path from 'path';
import crypto from 'crypto';
import { cleanupOldFiles } from './cleanup';


const app = express();

// Updated CORS configuration
app.use(cors({
  origin: [
    'https://schengenvisaphoto.com',
    'https://photoforvisa.com',
    'https://vercel.live',
    'https://schengen-visa-photo-generator-s6s7oko2k.vercel.app',
    'https://schengen-visa-photo-generator.vercel.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const upload = multer();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

// Load face-api models when the server starts
loadModels().catch(console.error);

function generateUniqueId(): string {
  return crypto.randomBytes(16).toString('hex');
}

app.post('/process-photo', upload.single('photo'), async (req, res) => {
  try {
    console.log('Received request to /process-photo');
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ error: 'Missing photo' });
    }

    console.log(`Received photo of size: ${req.file.size} bytes`);

    const config = JSON.parse(req.body.config || '{}');
    console.log('Processing photo with config:', config);

    const processedImageBase64 = await processPhoto(req.file.buffer, config);

    console.log('Photo processed successfully');

    const uniqueId = generateUniqueId();
    console.log(`Generated unique ID: ${uniqueId}`);

    res.json({ 
      photoUrl: `data:image/png;base64,${processedImageBase64}`,
      downloadUrl: `/download-image/${uniqueId}`
    });
    console.log('Response sent successfully');
  } catch (error: unknown) {
    console.error('Error in /process-photo route:', error);
    if (error instanceof Error) {
      console.error(error.stack);
      res.status(500).json({ error: 'Failed to process photo', details: error.message });
    } else {
      res.status(500).json({ error: 'Failed to process photo', details: 'An unknown error occurred' });
    }
  }
});

app.get('/download-image/:id', async (req, res) => {
  const id = req.params.id;
  const imagePath = path.join(__dirname, '..', 'processed_images', `${id}.png`);
  
  try {
    res.sendFile(imagePath);
  } catch (error) {
    res.status(404).send('Image not found');
  }
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  // Run cleanup every hour
  setInterval(cleanupOldFiles, 60 * 60 * 1000);
});
