
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { DatasetStats, CleaningPlan } from '../types';

export const generateCleaningPlan = async (stats: DatasetStats): Promise<CleaningPlan> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Optimize Payload: AGGRESSIVE REDUCTION
  // The API is erroring with 500/XHR due to payload size or timeout.
  // We strictly limit context to the absolute minimum required.
  
  const problematicColumns = stats.columns
    .filter(c => c.issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length);
    
  // LIMIT: Top 6 problematic columns ONLY. No clean columns context.
  const columnsToSend = problematicColumns.slice(0, 6);

  const summaryForAI = {
    rowCount: stats.rowCount,
    colCount: stats.columnCount,
    dupeRows: stats.duplicateRows,
    // Minify keys to save tokens
    cols: columnsToSend.map(c => ({
      name: c.name.substring(0, 40), // Truncate name
      type: c.inferredType,
      miss: Math.round((c.missingCount / stats.rowCount) * 100) + '%',
      unique: c.uniqueCount > 100 ? '>100' : c.uniqueCount,
      // Top 2 issues, truncated description to 50 chars
      issues: c.issues.slice(0, 2).map(i => `${i.type}: ${i.description.substring(0, 50)}`)
    }))
  };

  const prompt = `
    Act as a Data Quality & BI Expert.
    Generate a JSON cleaning plan.

    INPUT SUMMARY:
    ${JSON.stringify(summaryForAI)}

    OUTPUT REQUIREMENTS:
    1. steps: Array (stepNumber, title, action, reason, powerQuery, excel, risk)
       - Order: Type, Text, Missing, Duplicates, Outliers, Validation.
    2. powerQuerySteps: Array of strings (M-code).
    3. excelFormulas: Array (issue, formula).
    4. biModeling: Object
       - factMeasures: String[]
       - dimensions: String[]
       - starSchema: String (text diagram)
       - kpis: Array (name, dax, description)
  `;

  // Schema defines the strict structure required
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      steps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            stepNumber: { type: Type.INTEGER },
            title: { type: Type.STRING },
            action: { type: Type.STRING },
            reason: { type: Type.STRING },
            powerQuery: { type: Type.STRING },
            excel: { type: Type.STRING },
            risk: { type: Type.STRING },
          },
          required: ["stepNumber", "title", "action", "reason", "powerQuery", "excel", "risk"]
        }
      },
      powerQuerySteps: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      excelFormulas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
             issue: { type: Type.STRING },
             formula: { type: Type.STRING }
          },
          required: ["issue", "formula"]
        }
      },
      biModeling: {
        type: Type.OBJECT,
        properties: {
          factMeasures: { type: Type.ARRAY, items: { type: Type.STRING } },
          dimensions: { type: Type.ARRAY, items: { type: Type.STRING } },
          starSchema: { type: Type.STRING },
          kpis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                dax: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "dax", "description"]
            }
          }
        },
        required: ["factMeasures", "dimensions", "starSchema", "kpis"]
      }
    },
    required: ["steps", "powerQuerySteps", "excelFormulas", "biModeling"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as CleaningPlan;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Safe fallback
    return {
      steps: [{ 
          stepNumber: 1, 
          title: "Analysis Error", 
          action: "Retry Analysis", 
          reason: "The AI service was overloaded by the dataset size.", 
          powerQuery: "N/A", 
          excel: "N/A", 
          risk: "None" 
      }],
      powerQuerySteps: ["// Error generating M-code"],
      excelFormulas: [],
      biModeling: {
        factMeasures: [],
        dimensions: [],
        starSchema: "Analysis unavailable.",
        kpis: []
      }
    };
  }
};

export const askDataQuestion = async (
  question: string, 
  stats: DatasetStats
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });

  // Create a chat-specific context. 
  // We need BREADTH (all columns) more than depth here so the user can ask about any column.
  // Aggressively minified to fit context window/payload limits.
  const allColumnsSummary = stats.columns.map(c => ({
    n: c.name, // Short key
    t: c.inferredType,
    miss: Math.round((c.missingCount / stats.rowCount) * 100),
    uniq: c.uniqueCount,
    // Only include issue types, not full descriptions, to save space
    iss: c.issues.map(i => i.type), 
    // Include numeric stats for context
    stats: c.numericStats ? { min: c.numericStats.min, max: c.numericStats.max, avg: Math.round(c.numericStats.mean) } : undefined
  }));

  const context = {
    rows: stats.rowCount,
    cols: stats.columnCount,
    missingTotal: stats.totalMissingCells,
    columns: allColumnsSummary
  };

  const prompt = `
    You are TidyPilot, a helpful data quality assistant.
    
    CONTEXT (Uploaded Dataset):
    ${JSON.stringify(context)}

    USER QUESTION: "${question}"

    INSTRUCTIONS:
    1. Answer using ONLY the provided context. Do NOT use external knowledge.
    2. If the question is not about the dataset's issues, cleaning, or BI structure, say: "I can only answer questions based on your uploaded file."
    3. Structure:
       Answer: [Direct, concise answer, max 4 sentences]
       Evidence: [Bullet point list of specific counts, %s, column names, or stats from context]
    4. Do not delete rows (except exact duplicates).
    5. Be professional and helpful.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat API Error:", error);
    return "I'm having trouble analyzing the data right now. Please try again.";
  }
};
