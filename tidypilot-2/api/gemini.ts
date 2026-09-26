import { GoogleGenAI, Type, Schema } from '@google/genai';
import { DatasetStats, CleaningPlan } from '../types';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Gemini API key is not configured.'
    });
  }

  try {
    const {
      operation,
      stats,
      question
    } = req.body as {
      operation: 'cleaningPlan' | 'ask';
      stats: DatasetStats;
      question?: string;
    };

    const ai = new GoogleGenAI({ apiKey });

    // ---------------------------------------------------------
    // CLEANING PLAN
    // ---------------------------------------------------------
    if (operation === 'cleaningPlan') {
      const problematicColumns = stats.columns
        .filter(c => c.issues.length > 0)
        .sort((a, b) => b.issues.length - a.issues.length);

      const columnsToSend = problematicColumns.slice(0, 6);

      const summaryForAI = {
        rowCount: stats.rowCount,
        colCount: stats.columnCount,
        dupeRows: stats.duplicateRows,
        cols: columnsToSend.map(c => ({
          name: c.name.substring(0, 40),
          type: c.inferredType,
          miss:
            Math.round((c.missingCount / stats.rowCount) * 100) + '%',
          unique: c.uniqueCount > 100 ? '>100' : c.uniqueCount,
          issues: c.issues
            .slice(0, 2)
            .map(
              i =>
                `${i.type}: ${i.description.substring(0, 50)}`
            )
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
                risk: { type: Type.STRING }
              },
              required: [
                'stepNumber',
                'title',
                'action',
                'reason',
                'powerQuery',
                'excel',
                'risk'
              ]
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
              required: ['issue', 'formula']
            }
          },

          biing: {
            type: Type.OBJECT,
            properties: {
              factMeasures: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },

              dimensions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },

              starSchema: {
                type: Type.STRING
              },

              kpis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    dax: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ['name', 'dax', 'description']
                }
              }
            },

            required: [
              'factMeasures',
              'dimensions',
              'starSchema',
              'kpis'
            ]
          }
        },

        required: [
          'steps',
          'powerQuerySteps',
          'excelFormulas',
          'biing'
        ]
      };

      const response = await ai.s.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema
        }
      });

      const text = response.text;

      if (!text) {
        throw new Error('No response from Gemini');
      }

      const result = JSON.parse(text) as CleaningPlan;

      return res.status(200).json({ result });
    }

    // ---------------------------------------------------------
    // ASK TIDYPILOT
    // ---------------------------------------------------------
    if (operation === 'ask') {
      if (!question) {
        return res.status(400).json({
          error: 'Question is required.'
        });
      }

      const allColumnsSummary = stats.columns.map(c => ({
        n: c.name,
        t: c.inferredType,
        miss: Math.round(
          (c.missingCount / stats.rowCount) * 100
        ),
        uniq: c.uniqueCount,
        iss: c.issues.map(i => i.type),
        stats: c.numericStats
          ? {
              min: c.numericStats.min,
              max: c.numericStats.max,
              avg: Math.round(c.numericStats.mean)
            }
          : undefined
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
        2. If the question is not about the dataset's issues, cleaning, or BI structure, say:
           "I can only answer questions based on your uploaded file."
        3. Structure:
           Answer: [Direct, concise answer, max 4 sentences]
           Evidence: [Bullet point list of specific counts, %s, column names, or stats from context]
        4. Do not delete rows (except exact duplicates).
        5. Be professional and helpful.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return res.status(200).json({
        result:
          response.text ||
          "I couldn't generate a response."
      });
    }

    return res.status(400).json({
      error: 'Invalid operation.'
    });

  } catch (error) {
    console.error('Gemini API Error:', error);

    return res.status(500).json({
      error: 'Gemini request failed.'
    });
  }
}
