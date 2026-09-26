import { GoogleGenAI } from '@google/genai';
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

    const ai = new GoogleGenAI({
      apiKey
    });

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
            Math.round(
              (c.missingCount / stats.rowCount) * 100
            ) + '%',
          unique:
            c.uniqueCount > 100
              ? '>100'
              : c.uniqueCount,
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

Generate a JSON cleaning plan for the uploaded dataset.

INPUT SUMMARY:
${JSON.stringify(summaryForAI)}

OUTPUT REQUIREMENTS:

1. steps:
Array of objects containing:
- stepNumber
- title
- action
- reason
- powerQuery
- excel
- risk

Order the steps:
Type, Text, Missing, Duplicates, Outliers, Validation.

2. powerQuerySteps:
Array of strings containing Power Query M-code.

3. excelFormulas:
Array of objects containing:
- issue
- formula

4. biModeling:
Object containing:
- factMeasures: String[]
- dimensions: String[]
- starSchema: String
- kpis: Array of objects containing:
  - name
  - dax
  - description
`;

      const schema = {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                stepNumber: { type: 'integer' },
                title: { type: 'string' },
                action: { type: 'string' },
                reason: { type: 'string' },
                powerQuery: { type: 'string' },
                excel: { type: 'string' },
                risk: { type: 'string' }
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
            type: 'array',
            items: {
              type: 'string'
            }
          },

          excelFormulas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                issue: { type: 'string' },
                formula: { type: 'string' }
              },
              required: ['issue', 'formula']
            }
          },

          biModeling: {
            type: 'object',
            properties: {
              factMeasures: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },

              dimensions: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },

              starSchema: {
                type: 'string'
              },

              kpis: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    dax: { type: 'string' },
                    description: { type: 'string' }
                  },
                  required: [
                    'name',
                    'dax',
                    'description'
                  ]
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
          'biModeling'
        ]
      };

      const interaction = await ai.interactions.create({
        model: 'gemini-3.8-flash',
        input: prompt,
        response_format: [
          {
            type: 'text',
            mime_type: 'application/json',
            schema
          }
        ]
      });

      const text = interaction.output_text;

      if (!text) {
        throw new Error('No response from Gemini');
      }

      const result = JSON.parse(text) as CleaningPlan;

      return res.status(200).json({
        result
      });
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
              avg: Math.round(
                c.numericStats.mean
              )
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

USER QUESTION:
${question}

INSTRUCTIONS:

1. Answer using ONLY the provided dataset context.
2. Do NOT use external knowledge.
3. If the question is not about the dataset's issues, cleaning, or BI structure, say:
"I can only answer questions based on your uploaded file."
4. Structure the answer as:

Answer:
[Direct, concise answer, maximum 4 sentences]

Evidence:
[Bullet point list of specific counts, percentages, column names, or statistics from the dataset context]

5. Do not delete rows except exact duplicates.
6. Be professional and helpful.
`;

      const interaction = await ai.interactions.create({
        model: 'gemini-3.8-flash',
        input: prompt
      });

      return res.status(200).json({
        result:
          interaction.output_text ||
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
