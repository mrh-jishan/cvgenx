import { GoogleGenAI } from '@google/genai';
import { AIProvider, ContentType } from './index';
import { buildPrompt } from './prompt';
import { DEFAULT_MODEL_NAME } from '../constants';

export class GeminiProvider implements AIProvider {
  async generateContent(
    jobDescription: string,
    type: ContentType,
    userInfo: any,
    apiKey?: string,
    modelName?: string,
  ): Promise<string> {
    if (!apiKey) throw new Error('Gemini API key is not set. Please add it in Settings.');
    const genAI = new GoogleGenAI({ apiKey });
    const prompt = buildPrompt(userInfo, jobDescription, type);
    const model = modelName || DEFAULT_MODEL_NAME;
    const response = await genAI.models.generateContent({
      model,
      contents: prompt.toString(),
    });
    
    // Clean the response text by removing code fences that Gemini sometimes adds
    let text = response.text || '';
    text = text.trim();
    
    // Remove markdown code fences: ```markdown ... ``` or ``` ... ```
    if (text.startsWith('```markdown')) {
      text = text.replace(/^```markdown\n?/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n?/, '');
    }
    if (text.endsWith('```')) {
      text = text.replace(/\n?```$/, '');
    }
    
    return text.trim();
  }
}

export async function validateGeminiKey(key: string): Promise<boolean> {
  if (!key) return true;
  try {
    const genAI = new GoogleGenAI({ apiKey: key });
    await genAI.models.generateContent({
      model: DEFAULT_MODEL_NAME,
      contents: 'ping',
    });
    return true;
  } catch (err) {
    console.error('Gemini API key validation failed:', err);
    return false;
  }
}
