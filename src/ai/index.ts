export type ContentType = 'resume' | 'coverLetter';
export interface AIProvider {
  generateContent(jobDescription: string, type: ContentType, userInfo: any): Promise<string>;
  validateKey?(key: string): Promise<boolean>;
}

import { GeminiProvider, validateGeminiKey } from './gemini';
import { OpenAIProvider, validateOpenAIKey } from './openai';

export { GeminiProvider, OpenAIProvider };

export class Provider implements AIProvider {
  private provider: AIProvider;
  private platform: 'gemini' | 'openai';

  constructor(platform: 'gemini' | 'openai') {
    this.platform = platform;
    if (platform === 'openai') {
      this.provider = new OpenAIProvider();
    } else {
      this.provider = new GeminiProvider();
    }
  }

  generateContent(jobDescription: string, type: ContentType, userInfo: any): Promise<string> {
    return this.provider.generateContent(jobDescription, type, userInfo);
  }

  async validateKey(key: string): Promise<boolean> {
    if (this.platform === 'openai') return validateOpenAIKey(key);
    return validateGeminiKey(key);
  }
}
