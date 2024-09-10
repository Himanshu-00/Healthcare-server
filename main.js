const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require("@google/generative-ai/server");
require('dotenv').config();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 7582;
const apiKey = process.env.API_KEY;

app.use(express.json());

//CORS Configuration
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
}));

// Multer storage setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Image analysis
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;

  try {
    const uploadResult = await fileManager.uploadFile(imagePath, {
      mimeType: req.file.mimetype,
      displayName: req.file.originalname,
    });

    const result = await model.generateContent([
      `**Health Analysis Report**
      1. Identify the body part and symptoms (e.g., redness, swelling, bumps, skin-disease, bone-fractures and more).
      2. Suggest possible causes (eczema, acne, etc.).
      3. Recommend home remedies and Ayurvedic options.
      4. Estimate recovery time.
      5. Advise when to see a doctor.
      6. Provide warnings for severe conditions.

      **Disclaimer**: This analysis is AI-generated and not a substitute for medical advice.
      `,
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);

    // Remove image after result
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error('File deletion failed:', err);
      }
    });

    res.json({ response: result.response.text() });

  } catch (err) {
    console.error('Error:', err);
    res.status(508).json({ err: err.message });
  }
});

// Text analysis with default healthcare bot prompt
app.post('/api/analyze-text', async (req, res) => {
  let { prompt } = req.body;

  // Default prompt
  const defaultPrompt = "You are a healthcare bot. Answer all questions related to healthcare.";

  
  if (!prompt || prompt.trim() === '') {
    prompt = defaultPrompt;
  } else {
    prompt = `${defaultPrompt}\n\n${prompt}`;
  }

  try {
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (err) {
    console.error('Error:', err);
    res.status(507).json({ err: err.message });
  }
});

// Handle CORS preflight requests (OPTIONS)
app.options('*', cors());

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
