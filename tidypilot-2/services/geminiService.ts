import { DatasetStats, CleaningPlan } from '../types';

type GeminiResponse<T> = {
  result?: T;
  error?: string;
};

const callGemini = async <T>(
  operation: 'cleaningPlan' | 'ask',
  stats: DatasetStats,
  question?: string
): Promise<T> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation,
      stats,
      question,
    }),
  });

  const data = (await response.json()) as GeminiResponse<T>;

  if (!response.ok || !data.result) {
    throw new Error(data.error || 'Gemini request failed');
  }

  return data.result;
};

export const generateCleaningPlan = async (
  stats: DatasetStats
): Promise<CleaningPlan> => {
  return callGemini<CleaningPlan>('cleaningPlan', stats);
};

export const askDataQuestion = async (
  question: string,
  stats: DatasetStats
): Promise<string> => {
  return callGemini<string>('ask', stats, question);
};
