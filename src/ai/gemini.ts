import fetch from 'node-fetch';
import { USER_BASE_INFO } from '../user-base-info';

export type ContentType = 'resume' | 'coverLetter';

export async function generateGeminiContent(jobDescription: string, type: ContentType): Promise<string> {
  const endpoint = 'https://api.gemini.com/v1/content/generate';
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not set in the environment variables.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jobDescription,
      type,
      userInfo: USER_BASE_INFO,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error generating content: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content;
}