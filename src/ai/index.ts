export type ContentType = 'resume' | 'coverLetter';
export interface AIProvider {
  generateContent(jobDescription: string, type: ContentType, userInfo: any): Promise<string>;
}

import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';

export { GeminiProvider, OpenAIProvider };

export class Provider implements AIProvider {
  private provider: AIProvider;
  constructor(platform: 'gemini' | 'openai') {
    if (platform === 'openai') {
      this.provider = new OpenAIProvider();
    } else {
      this.provider = new GeminiProvider();
    }
  }
  generateContent(jobDescription: string, type: ContentType, userInfo: any): Promise<string> {
    return this.provider.generateContent(jobDescription, type, userInfo);
  }
}
