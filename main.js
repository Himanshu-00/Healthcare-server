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
  ### **Comprehensive Health Analysis Report**

  1. **Identification of Affected Body Part and Symptoms:**
     - Clearly specify the **affected body part** (e.g., skin, bones, muscles, internal organs, respiratory system, etc.).
     - **Describe the location and nature of the symptoms** in detail (e.g., sharp pain, itching, swelling, lumps, redness, shortness of breath).
     - **Rate the severity** of the symptoms (mild, moderate, severe) and **duration** (how long they’ve been occurring, frequency).
     - Ask the patient whether they’ve experienced **similar symptoms in the past** and any **potential triggering factors** (e.g., physical activity, environmental exposure, seasonal changes).

  2. **Symptom Development and Detailed Analysis:**
     - **Track the progression of symptoms**: when did they start, how have they evolved (worsened or improved), and whether they fluctuate or remain constant.
     - Consider **additional symptoms** that may be related (e.g., fever, nausea, dizziness, weakness, joint pain, swelling, skin changes).
     - Analyze if there are any **external factors** (e.g., diet, physical trauma, travel, recent illness, or stress) that may be contributing to the condition.
     - Ask about any **medications, supplements, or substances** the patient is taking.

  3. **Common and Rare Causes of the Symptoms:**
     - Provide a **list of potential causes** for the symptoms (e.g., infections, inflammatory conditions, autoimmune diseases, trauma, allergies, nutritional deficiencies, mental health factors).
     - **Differentiate between common and rare conditions** to help narrow down the cause (e.g., common cold vs. influenza, eczema vs. skin infection, tendonitis vs. a bone fracture).
     - Use **risk factors** such as age, gender, occupation, and medical history to tailor the analysis (e.g., joint pain may be more likely to indicate arthritis in older individuals).

  4. **Comprehensive Condition Assessment:**
     - **Assess the likelihood of specific medical conditions** based on the reported symptoms. This may include:
       - **Respiratory issues**: Asthma, bronchitis, pneumonia, or COVID-19.
       - **Skin conditions**: Psoriasis, dermatitis, hives, or fungal infections.
       - **Musculoskeletal problems**: Arthritis, muscle strain, fractures, or dislocations.
       - **Digestive concerns**: GERD, food intolerances, ulcers, or IBS.
       - **Neurological symptoms**: Migraines, seizures, nerve damage, or strokes.
     - Offer explanations of **how these conditions manifest** and what specific symptoms set them apart.

  5. **Suggested Home Remedies and Preventive Measures:**
     - For **mild to moderate symptoms**, suggest **safe, evidence-based home remedies**:
       - **Skin conditions**: Moisturizing creams, cool compresses, aloe vera, and oatmeal baths.
       - **Digestive issues**: Probiotics, ginger tea, hydration, avoiding trigger foods.
       - **Pain relief**: Ice, heat therapy, stretching, and rest for musculoskeletal issues.
     - Provide **Ayurvedic or holistic remedies** where appropriate (e.g., turmeric for inflammation, yoga for stress relief, ginger for digestion, neem for skin).
     - Offer **prevention tips** based on condition type (e.g., improving posture, dietary changes, wearing protective clothing for sun-sensitive skin, or regular exercise for joint mobility).

  6. **When to Consult a Doctor or Seek Immediate Help:**
     - Outline **specific symptoms** that warrant professional medical attention (e.g., high fever, difficulty breathing, chest pain, severe or persistent symptoms, significant weight loss, or neurological deficits).
     - Emphasize **emergency warning signs** (e.g., signs of stroke, heart attack, sepsis, anaphylactic shock).
     - Recommend **seeking specialized medical care** for ongoing symptoms or chronic conditions (e.g., dermatologist for skin conditions, orthopedic specialist for joint or bone issues, gastroenterologist for persistent digestive problems).
     - Advise the **timing for follow-ups** (e.g., if symptoms persist beyond a certain number of days or worsen unexpectedly).

  7. **Additional Diagnostics and Tests:**
     - Recommend **specific diagnostic tests** or imaging that might provide clarity (e.g., blood tests, X-rays, MRIs, allergy tests, or stool samples).
     - Provide explanations for what the tests can help diagnose (e.g., **blood work** for infections or nutritional deficiencies, **X-rays** for fractures, **allergy tests** for suspected allergic reactions).
     - Suggest **monitoring symptoms** through journals or symptom trackers, which the patient can share with their doctor for better insights.

  8. **Lifestyle Adjustments and Long-Term Care:**
     - Offer **practical lifestyle changes** to manage or prevent symptoms (e.g., adopting a **balanced diet**, improving **sleep patterns**, practicing **stress management** techniques, incorporating **regular physical activity**).
     - Suggest **hygiene practices** (e.g., proper skin care, dental hygiene, or environmental precautions).
     - Highlight **importance of mental health** and offer ways to manage **stress, anxiety, or depression**, which could be impacting physical symptoms.
     - If applicable, recommend **support groups or community resources** for individuals with chronic conditions.

  9. **Severe Condition Alerts and Warnings:**
     - Highlight any **severe conditions** the symptoms could indicate, such as:
       - **Cardiovascular emergencies** (e.g., heart attack, stroke).
       - **Severe infections** (e.g., sepsis, meningitis).
       - **Cancer warning signs** (e.g., unexplained lumps, unusual bleeding).
       - **Serious respiratory issues** (e.g., pneumonia, chronic obstructive pulmonary disease, or COVID-19).
     - Encourage patients to recognize these **red flags** and seek immediate emergency care if needed.
     - Warn against **self-medicating** in severe cases and emphasize professional diagnosis.

  10. **Follow-Up and Ongoing Health Maintenance:**
     - Offer guidance on **next steps for health maintenance** after recovery:
       - **Regular check-ups** with a healthcare provider for ongoing conditions.
       - **Vaccination reminders** (e.g., flu shots, tetanus boosters).
       - **Regular screening tests** for certain age groups (e.g., cholesterol tests, mammograms, or colonoscopies).
     - Provide recommendations for **maintaining overall well-being**, such as tracking hydration, staying active, and balancing work-life stress.

  ### **Disclaimer:**
  - This analysis is **AI-generated** and not intended as a substitute for professional medical advice.
  - Consult with a healthcare professional for accurate diagnosis and tailored treatment.
  - For emergencies or life-threatening conditions, seek immediate medical attention.
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
