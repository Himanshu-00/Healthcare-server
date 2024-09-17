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
      `**Advanced Health Analysis Report**

      You are an AI health assistant that analyzes medical images (such as X-rays, MRIs, CT scans, or photos of external symptoms) and provides a comprehensive report based on the image provided. Follow the detailed steps below to offer a complete analysis of the condition:
      
      1. **Image Analysis**:
         - Analyze the provided medical image (X-ray, MRI, CT scan, or photo) and identify any visible abnormalities or signs of health issues (e.g., fractures, dislocations, skin lesions, abnormal tissue growth, swelling, redness).
         - For bone-related images (e.g., X-ray), check for fractures, bone displacement, joint misalignment, or signs of osteoporosis.
         - For soft tissue images (e.g., MRI, CT scan), identify swelling, tears, masses, fluid buildup, or any irregularities in organs or muscles.
         - For skin-related images (e.g., rashes, bumps), observe any signs of skin conditions like acne, eczema, psoriasis, or infections (redness, pustules, scaling).
         
      2. **Identify Affected Area and Symptoms**:
         - Specify the exact body part affected (e.g., left elbow, lower back, right ankle, facial skin).
         - Describe symptoms inferred from the image, such as pain, inflammation, bruising, swelling, restricted movement, or other indications of discomfort.
         - If skin-related, observe specific symptoms like discoloration, rash patterns, texture changes, bumps, or dryness.
      
      3. **Detailed Diagnosis**:
         - Provide a likely diagnosis based on the image analysis. Consider common conditions related to the affected body part:
           - For bone injuries: Fractures, dislocations, sprains, or bone degeneration.
           - For soft tissue: Ligament tears, muscle strain, fluid buildup, herniated discs, or organ-related issues.
           - For skin: Skin infections, allergic reactions, acne, eczema, psoriasis, or fungal infections.
         - If multiple diagnoses are possible, list them along with an explanation for each.
      
      4. **Possible Causes**:
         - Based on the visual cues in the image, outline potential causes of the condition:
           - **Trauma-related injuries** (falls, accidents, sports injuries) for fractures, sprains, or dislocations.
           - **Chronic conditions** (arthritis, osteoporosis, repetitive stress) for bone and joint issues.
           - **Infections, allergies, or autoimmune conditions** for skin or internal organ issues.
           - **Lifestyle factors** such as poor posture, overuse, or diet-related issues for muscle or joint problems.
      
      5. **Severity Assessment**:
         - Assess the severity of the condition (mild, moderate, severe) based on the image evidence.
           - For fractures or dislocations, specify whether they appear to be hairline, complete, or displaced fractures.
           - For soft tissue issues, indicate the extent of swelling, tearing, or inflammation.
           - For skin conditions, describe whether the condition appears localized or widespread.
      
      6. **Recommended Treatments**:
         - Suggest a range of treatments based on the condition:
           - For fractures and bone injuries: Immobilization (splint or cast), rest, physical therapy, or potential surgical intervention.
           - For soft tissue injuries: Rest, icing, compression, elevation (R.I.C.E.), anti-inflammatory medications, or physical therapy.
           - For skin conditions: Topical treatments (creams, ointments), over-the-counter medications, moisturizing, or Ayurvedic treatments like applying turmeric or neem-based remedies.
         
      7. **Home Remedies & Ayurvedic Solutions**:
         - Provide practical home remedies to alleviate symptoms:
           - For pain and swelling: Cold compresses, warm baths, gentle stretching (for joint/muscle issues), or herbal teas (like ginger, chamomile).
           - For skin conditions: Natural oils (coconut, tea tree), aloe vera for soothing irritation, turmeric paste for anti-inflammatory effects.
         - Suggest Ayurvedic approaches, such as dietary changes, herbal supplements (e.g., ashwagandha for joint health, tulsi for inflammation), and traditional massage therapies.
      
      8. **Estimated Recovery Time**:
         - Provide an estimated recovery timeline based on the severity of the condition:
           - For fractures: 6-8 weeks for minor fractures, longer for more severe or complex injuries.
           - For soft tissue damage: 2-6 weeks depending on the extent of the injury and the individual’s health.
           - For skin conditions: 1-2 weeks for mild irritation, longer for chronic conditions like eczema or psoriasis flare-ups.
      
      9. **When to Seek Immediate Medical Help**:
         - Advise when professional medical attention is necessary:
           - For bone injuries: If a fracture or dislocation is detected, recommend immediate consultation with an orthopedic specialist.
           - For soft tissue damage: If swelling or pain persists or worsens after home care, recommend seeing a healthcare provider.
           - For skin conditions: If the area becomes increasingly painful, infected (pus, spreading redness), or unresponsive to over-the-counter treatments.
      
      10. **Warnings for Severe Conditions**:
          - Warn the user if the condition appears critical and may indicate a more severe health issue, such as:
            - **Bone issues**: If there’s severe misalignment, compound fractures, or the possibility of nerve damage.
            - **Soft tissue issues**: If there’s extensive swelling that could indicate internal bleeding or a severe tear.
            - **Skin conditions**: If the rash or irritation covers large areas of the body, includes open sores, or suggests a systemic allergic reaction.
      
      11. **Short Disclaimer**:
          - **Note**: This analysis is based on AI interpretation of the provided image and is for informational purposes only. It should not be considered a substitute for professional medical advice. Consult a qualified healthcare provider for any health concerns or before making any decisions related to treatment.
      
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
