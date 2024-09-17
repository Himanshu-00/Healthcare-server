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
      `
      You are tasked with generating an **informational health report** based on hypothetical symptoms provided. This report should present general health knowledge, educational content, and common factors related to various conditions based on public health data. This report is not meant to replace medical advice.

1. **Symptoms Overview**:
   - Start by describing the **hypothetical body part** that is affected (e.g., skin, bones, muscles, or internal organs).
   - Provide a list of **common symptoms** that are associated with this condition (e.g., redness, swelling, pain, lumps, difficulty breathing).
   
2. **General Possible Causes**:
   - List **common potential causes** for the symptoms described (e.g., eczema, acne for skin, fractures for bone issues, asthma for breathing problems).
   - Explain why these conditions may commonly be associated with the symptoms.

3. **General Home Care Tips**:
   - Provide **general home care tips** that are common for such conditions.
   - Offer tips that are **natural and common** (e.g., hydration, rest, diet).

4. **When to Consult a Healthcare Professional**:
   - Explain the **general signs** that may indicate when it is time to consult a healthcare professional for further advice.
   - Focus on common emergency symptoms (e.g., chest pain, difficulty breathing).


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


// Report Analysis
app.post('/api/analyze-report', upload.single('report'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const reportPath = req.file.path;

  try {
    const uploadResult = await fileManager.uploadFile(reportPath, {
      mimeType: req.file.mimetype,
      displayName: req.file.originalname,
    });

    const reportPrompt = `

    
        ### **Patient Details:**
        - **Name:** [Patient Name]
        - **Age:** [Patient Age]
        - **Gender:** [Patient Gender]
        - **Report Date:** [Report Date]
        - **Medical History:** [Brief Medical History]

        ### **Report Data:**
        - **Metric 1:** [Name of Metric]  [Value] [Unit]
        - **Metric 2:** [Name of Metric]  [Value] [Unit]
        - **Metric 3:** [Name of Metric]  [Value] [Unit]
        - **Metric 4:** [Name of Metric]  [Value] [Unit]
        - **Other Metric 1:** [Name of Metric]  [Value] [Unit]
        - **Other Metric 2:** [Name of Metric]  [Value] [Unit]

        ### **Metrics Below Normal:**
        - **Metric 1:** [Name of Metric]  [Value] [Unit] (Description of why it's considered below normal)
        - **Metric 2:** [Name of Metric]  [Value] [Unit] (Description of why it's considered below normal)
        ### - **Above Normal Metrics:** [Any other metrics that are above normal]

        ### **Potential Conditions:**
        - **Condition 1:** [Condition Name]
          - **Description:** [Brief description of the condition]
          - **Relevant Metrics:** [Metrics that suggest this condition]
        - **Condition 2:** [Condition Name]
          - **Description:** [Brief description of the condition]
          - **Relevant Metrics:** [Metrics that suggest this condition]
        - **Condition 3:** [Condition Name]
          - **Description:** [Brief description of the condition]
          - **Relevant Metrics:** [Metrics that suggest this condition]

        ### **Recommendations:**
        - **Further Tests:**
          - **Test 1:** [Recommended Test Name]
            - **Purpose:** [Purpose of the test]
            - **Preparation:** [Preparation required for the test]
          - **Test 2:** [Recommended Test Name]
            - **Purpose:** [Purpose of the test]
            - **Preparation:** [Preparation required for the test]
        - **Lifestyle Changes:**
          - **Change 1:** [Suggested Lifestyle Change]
            - **Impact:** [How this change benefits health]
          - **Change 2:** [Suggested Lifestyle Change]
            - **Impact:** [How this change benefits health]

        ### **When to See a Doctor:**
        - **Symptom or Condition:** [Symptom or Condition]
          - **When to Seek Help:** [Guidelines on when to consult a doctor]

    {Below prompt is just for your understanding do not how this in output.}

        ### **Types of Reports Supported:**

        1. **Blood Test Reports:**
          - Blood counts, cholesterol levels, glucose levels, etc.

        2. **Eyes Test Reports:**
          - Vision acuity, intraocular pressure, etc.

        3. **Cardiovascular Reports:**
          - Blood pressure, heart rate, ECG results, etc.

        4. **Pulmonary Function Reports:**
          - Spirometry results, lung volumes, etc.

        5. **Gastrointestinal Reports:**
          - Liver function tests, stool analysis, etc.

        6. **Neurological Reports:**
          - Brain scans, neurological function tests, etc.

        7. **Psychiatric Reports:**
          - Mental health assessments, psychological evaluations, etc.

        8. **Dermatology Reports:**
          - Skin lesions, biopsy results, etc.

        9. **Orthopedic Reports:**
          - Bone density, joint function, etc.

        10. **Imaging Reports:**
            - **X-Rays:** Bone and organ images.
            - **CT Scans:** Detailed cross-sectional images.
            - **MRI Scans:** Detailed organ and tissue images.
            - **Ultrasound:** Images of organs and structures.

        11. **Biopsy Reports:**
            - Tissue sample analysis.

        12. **Pathology Reports:**
            - Tissue or fluid sample diagnosis and classification.

        13. **Genetic Testing Reports:**
            - Genetic condition analysis and predispositions.

      
    `;

    const result = await model.generateContent([
      reportPrompt,
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);

    // Remove report after result
    fs.unlink(reportPath, (err) => {
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

// Handle CORS preflight requests (OPTIONS)
app.options('*', cors());

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
