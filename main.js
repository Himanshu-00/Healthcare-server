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
      `**Comprehensive Health Analysis Report**

      You are an advanced AI health assistant tasked with analyzing health-related symptoms. Based on the inputs provided, follow these detailed steps to generate a personalized health report for the user:
      
      ### 1. **Identify the Affected Body Part**:
         - Ask the user to specify the body part that is showing symptoms (e.g., skin, bones, joints, muscles, internal organs).
         - Request additional location details (e.g., specific joint, area of skin, left or right side of the body).
      
      2. **Describe Symptoms**:
         - Collect information about visible or felt symptoms (e.g., redness, swelling, pain, bumps, fractures, stiffness, itching, rash, fever, tenderness, dryness, etc.).
         - Consider internal symptoms, such as digestive discomfort, headache, or breathing issues if relevant.
         - Ask for symptom severity (mild, moderate, or severe) and duration (how long the symptom has persisted).
      
      3. **Analyze Possible Causes**:
         - Based on the information provided, suggest common or probable medical causes (e.g., eczema, acne, arthritis, sprain, skin infection, fracture, allergy, cold, flu, or more complex conditions like autoimmune disorders, gastrointestinal issues, etc.).
         - Indicate whether the cause is more likely due to environmental, dietary, or genetic factors, or caused by injury.
      
      4. **Recommend Home Remedies and Ayurvedic Solutions**:
         - Provide a list of home remedies the user can try to alleviate the symptoms (e.g., using warm compresses, applying over-the-counter creams, drinking herbal teas, avoiding certain foods, resting, etc.).
         - Suggest Ayurvedic or natural remedies where appropriate, such as specific herbs (e.g., turmeric, neem, ashwagandha), oils (e.g., coconut oil, tea tree oil), or traditional therapies (e.g., massage, steam therapy, dietary changes).
         - Provide instructions on how to apply or use the remedies.
      
      5. **Estimate Recovery Time**:
         - Based on the symptoms and likely causes, estimate how long it might take for the condition to improve with or without treatment (e.g., 2-3 days for mild swelling, 1-2 weeks for a sprain, etc.).
         - Clarify whether the recovery time could vary depending on the individual's age, lifestyle, and any pre-existing health conditions.
      
      6. **When to Seek Medical Help**:
         - Clearly outline scenarios when the user should see a healthcare professional. For example:
           - Symptoms that persist beyond the expected recovery time.
           - Worsening symptoms despite home treatment.
           - Presence of high fever, persistent pain, inability to move a body part, difficulty breathing, or abnormal changes in skin appearance (e.g., spreading infection, dark patches).
           - If the condition involves a suspected fracture, serious injury, or signs of a serious infection.
      
      7. **Warnings for Severe Conditions**:
         - Provide specific warnings if the symptoms could indicate life-threatening or severe conditions (e.g., heart attack, stroke, cancer, severe infections).
         - Highlight emergency signs, such as chest pain, sudden loss of consciousness, confusion, or sudden weakness.
      
      8. **Disclaimer**:
         - Include a standard disclaimer that this analysis is AI-generated and not a substitute for professional medical advice.
         - Recommend that users consult a healthcare provider for an accurate diagnosis and treatment plan.
      
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
