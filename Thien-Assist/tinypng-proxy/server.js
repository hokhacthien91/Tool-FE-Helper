const express = require('express');
const cors = require('cors');
const tinify = require('tinify');

const app = express();
const PORT = 3001;

// TinyPNG API Key
tinify.key = '8Tdvshv1n8zsfpllqY0T5HJGGLbc8jWk';

// Enable CORS for Figma plugin
app.use(cors());

// Parse raw binary data
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'TinyPNG Proxy Server is running' });
});

// Compress endpoint
app.post('/compress', async (req, res) => {
  try {
    const imageBuffer = req.body;

    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({ error: 'No image data received' });
    }

    console.log(`Received image: ${imageBuffer.length} bytes`);

    // Compress with TinyPNG
    const source = tinify.fromBuffer(imageBuffer);
    const compressedBuffer = await source.toBuffer();

    const originalSize = imageBuffer.length;
    const compressedSize = compressedBuffer.length;
    const savings = Math.round((1 - compressedSize / originalSize) * 100);

    console.log(`Compressed: ${originalSize} -> ${compressedSize} bytes (${savings}% smaller)`);

    // Return compressed image
    res.set('Content-Type', 'application/octet-stream');
    res.set('X-Original-Size', originalSize.toString());
    res.set('X-Compressed-Size', compressedSize.toString());
    res.set('X-Savings', savings.toString());
    res.send(compressedBuffer);

  } catch (error) {
    console.error('Compression error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Check API usage
app.get('/usage', async (req, res) => {
  try {
    // Make a dummy validation call to get compression count
    await tinify.validate();
    const compressionsThisMonth = tinify.compressionCount;
    res.json({
      compressionsThisMonth,
      limit: 500,
      remaining: 500 - compressionsThisMonth
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`TinyPNG Proxy Server running at http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /compress - Compress image');
  console.log('  GET /usage - Check API usage');
});
