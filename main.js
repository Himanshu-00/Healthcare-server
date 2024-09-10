const express = require('express');
const { GoogleGenerativeAI} = require('@google/generative-ai');
const { GoogleAIFileManager } = require("@google/generative-ai/server");
require('dotenv').config();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 7582;
const apiKey = process.env.API_KEY;

app.use(cors({
  origin: 'http://localhost:5173',  // Allow only this origin (your frontend)
  methods: ['GET', 'POST'],  // Allow these HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization']  // Allow specific headers
}));
app.use(express.json());

// Image upload
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

app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;

  try {
    const uploadResult = await fileManager.uploadFile(imagePath, {
      mimeType: req.file.mimetype,
      displayName: req.file.originalname,
    });

    const result = await model.generateContent([
      `**Health Analysis Report**
      1. Identify the body part and symptoms (e.g., redness, swelling, bumps, skin-disease, bone-fractures and more which can
        be analysed using images).
      2. Suggest possible causes (eczema, acne, etc.).
      3. Recommend home remedies and Ayurvedic options.
      4. Estimate recovery time.
      5. Advise when to see a doctor.
      6. Provide warnings for severe conditions.
      
      **Disclaimer**: This analysis is AI-generated and not a substitute for medical advice.

      Note - After Heading subheading should in bullets circle 
      `,
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);

    // Remove Image After Result
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error('File deletion failed:', err); // Handle error in callback
      }
    });

    res.json({ response: result.response.text() });

  } catch (err) {
    console.error('Error:', err);
    res.status(508).json({ err: err.message });
  }
});

app.post('/api/analyze-text', async (req, res) => {
  const { prompt } = req.body;

   // Define the default prompt for the healthcare bot
   const defaultPrompt = "You are a healthcare bot. Answer all questions related to healthcare.";

   // If the user hasn't provided a prompt, use the default healthcare prompt
   if (!prompt || prompt.trim() === '') {
     prompt = defaultPrompt;
   } else {
     // Prepend the default healthcare context to the user's prompt
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
