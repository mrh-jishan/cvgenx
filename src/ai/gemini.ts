import fetch from 'node-fetch';
import { AIProvider, ContentType } from './index';
import { buildPrompt } from './prompt';

export class GeminiProvider implements AIProvider {
  async generateContent(
    jobDescription: string,
    type: ContentType,
    userInfo: any,
  ): Promise<string> {
    // Use shared prompt
    const prompt = buildPrompt(userInfo, jobDescription, type);

    const response = await fetch('https://api.gemini.com/v1/content/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
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

export async function validateGeminiKey(key: string): Promise<boolean> {
  if (!key) return true;
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
        key,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        }),
      },
    );
    return res.status === 200 || res.status === 400; // 400 means bad prompt, but key is valid
  } catch {
    return false;
  }
}
