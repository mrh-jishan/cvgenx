import { GoogleGenAI } from '@google/genai';
import { AIProvider, ContentType } from './index';
import { buildPrompt } from './prompt';

export class GeminiProvider implements AIProvider {
  async generateContent(jobDescription: string, type: ContentType, userInfo: any): Promise<string> {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const prompt = buildPrompt(userInfo, jobDescription, type);
    const response = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt.toString(),
    });
    return response.text!;
  }
}

export async function validateGeminiKey(key: string): Promise<boolean> {
  if (!key) return true;
  try {
    const genAI = new GoogleGenAI({ apiKey: key });
    await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'ping',
    });
    return true;
  } catch (err) {
    console.error('Gemini API key validation failed:', err);
    return false;
  }
}
