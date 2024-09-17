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
      ### **Advanced Health Analysis Report**

      You are an AI health assistant tasked with providing a comprehensive health analysis based on the provided medical image (X-ray, MRI, CT scan, or photo). Follow the steps below to generate a detailed report:
      
      ### 1. **Analyze the Image**:
         - Examine the medical image thoroughly to identify any visible abnormalities or signs of health issues. For bone-related images (e.g., X-ray), look for fractures, dislocations, or joint misalignments. For soft tissue images (e.g., MRI, CT scan), identify signs of swelling, tears, or abnormal growths. For skin images, observe symptoms such as redness, bumps, or rashes.
      
         ### 2. **Identify the Affected Area and Symptoms**:
         - Clearly describe the affected body part based on the image (e.g., left elbow, lower back, facial skin).
         - Note the specific symptoms visible in the image, such as pain, inflammation, bruising, swelling, or other indicators of discomfort. 
      
         ### 3. **Detailed Diagnosis**:
         - Provide a likely diagnosis based on the image analysis:
           - **Bone Injuries**: Identify fractures (hairline, complete, displaced), dislocations, or signs of bone degeneration.
           - **Soft Tissue Issues**: Describe muscle strains, ligament tears, fluid buildup, or organ abnormalities.
           - **Skin Conditions**: Diagnose conditions like acne, eczema, psoriasis, infections, or allergic reactions.
      
           ### 4. **Possible Causes**:
         - Based on the image, outline potential causes for the condition:
           - **Traumatic Injuries**: Accidents, falls, sports injuries.
           - **Chronic Conditions**: Arthritis, osteoporosis, repetitive strain.
           - **Infections or Allergies**: Skin infections, allergic reactions, autoimmune disorders.
           - **Lifestyle Factors**: Poor posture, overuse, or dietary issues.
      
           ### 5. **Severity Assessment**:
         - Assess the severity of the condition:
           - For fractures: Indicate whether they are minor, moderate, or severe.
           - For soft tissue issues: Describe the extent of swelling or tearing.
           - For skin conditions: Determine whether the condition is mild, moderate, or severe.
      
           ### 6. **Recommended Treatments**:
         - Provide suggested treatments based on the condition:
           - **Bone Injuries**: Recommend immobilization (splint or cast), rest, potential physical therapy, or surgery if needed.
           - **Soft Tissue Injuries**: Suggest R.I.C.E. (Rest, Ice, Compression, Elevation), anti-inflammatory medications, or physical therapy.
           - **Skin Conditions**: Recommend topical treatments, over-the-counter medications, or natural remedies like aloe vera and herbal teas.
      
           ### 7. **Home Remedies & Ayurvedic Solutions**:
         - Offer practical home remedies:
           - For pain and swelling: Cold compresses, warm baths, or herbal teas.
           - For skin conditions: Natural oils (coconut, tea tree), aloe vera, or turmeric paste.
         - Suggest Ayurvedic remedies:
           - Herbal supplements (e.g., ashwagandha, turmeric), dietary changes, or traditional therapies.
      
           ### 8. **Estimated Recovery Time**:
         - Provide an estimated recovery timeline:
           - **Bone Injuries**: 6-8 weeks for minor fractures, longer for severe injuries.
           - **Soft Tissue Damage**: 2-6 weeks depending on severity.
           - **Skin Conditions**: 1-2 weeks for mild issues, longer for chronic conditions.
      
           ### 9. **When to Seek Immediate Medical Help**:
         - Advise on when to seek professional medical attention:
           - **Bone Injuries**: If fractures or dislocations are detected, immediate consultation with an orthopedic specialist is recommended.
           - **Soft Tissue Injuries**: If symptoms persist or worsen despite home care, consult a healthcare provider.
           - **Skin Conditions**: If the condition becomes increasingly painful, infected, or unresponsive to treatment, seek medical advice.
      
           ### 10. **Warnings for Severe Conditions**:
          - Alert if the condition appears severe or life-threatening:
            - **Bone Issues**: Severe misalignment, compound fractures, potential nerve damage.
            - **Soft Tissue Issues**: Extensive swelling, possible internal bleeding, severe tears.
            - **Skin Conditions**: Widespread rashes, open sores, systemic reactions.
      
            ### 11. **Brief Disclaimer**:
          - **Note**: This analysis is based on AI interpretation of the provided image and is for informational purposes only. It should not be considered a substitute for professional medical advice. Consult a qualified healthcare provider for any health concerns or before making any decisions related to treatment.{Make it in one line and short.}
      
      Ensure that the analysis is as detailed and accurate as possible based on the provided image, covering all relevant aspects of the condition.
      
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
