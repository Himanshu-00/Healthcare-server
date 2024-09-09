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

app.use(cors());
app.use(express.json());

const validMedicalQuestions = [
  "Describe the symptoms of",
  "What are the treatments for",
  "How can I manage",
  "What is this condition?",
  "Treatment for specific condition?",
  "What are the causes of",
  "How can I prevent",
  "Is this condition contagious?",
  "What medications are recommended for",
  "What are the side effects of",
  "What should I avoid if I have",
  "What are the common risk factors for",
  "What lifestyle changes can help with",
  "How do I know if I need to see a doctor for",
  "How long does recovery take for",
  "What is the prognosis for",
  "Can this condition be treated at home?",
  "What are the warning signs of",
  "What is the difference between",
  "How can I relieve the symptoms of",
  "When should I seek emergency care for",
  "Is there a cure for",
  "Can this condition recur?",
  "What are common complications of",
  "What are the early signs of",
  "How does this condition affect daily life?",
  "What dietary changes can help with",
  "What are the latest treatment options for",
  "Is surgery necessary for",
  "What are the long-term effects of"
];


const matchesMedicalQuestion = (prompt) => {
  return validMedicalQuestions.some((template) => prompt.startsWith(template));
};

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


if (!matchesMedicalQuestion(prompt)) {
  return res.status(400).json({ error: "Invalid prompt. Please use medical-specific questions." });
}

app.post('/api/analyze-text', async (req, res) => {
  const { prompt } = req.body;

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
