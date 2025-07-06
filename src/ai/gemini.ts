import fetch from 'node-fetch';
import { AIProvider, ContentType } from './index';
import { buildPrompt } from './prompt';

export class GeminiProvider implements AIProvider {
  async generateContent(
    jobDescription: string,
    type: ContentType,
    userInfo: any,
  ): Promise<string> {
    const endpoint = 'https://api.gemini.com/v1/content/generate';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('Gemini API key is not set in the environment variables.');
    }

    // Use shared prompt
    const prompt = buildPrompt(userInfo, jobDescription, type);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        type,
        userInfo,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error generating content: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content;
  }
}
