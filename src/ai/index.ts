export type ContentType = 'resume' | 'coverLetter';
export interface AIProvider {
  generateContent(
    jobDescription: string,
    type: ContentType,
    userInfo: any,
    apiKey?: string,
    modelName?: string,
  ): Promise<string>;
  validateKey?(key: string): Promise<boolean>;
}

import { GeminiProvider, validateGeminiKey } from './gemini';

export { GeminiProvider };

export class Provider implements AIProvider {
  private provider: AIProvider;
  private apiKey?: string;
  private modelName?: string;

  constructor(apiKey?: string, modelName?: string) {
    this.provider = new GeminiProvider();
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  generateContent(
    jobDescription: string,
    type: ContentType,
    userInfo: any,
    apiKey?: string,
    modelName?: string,
  ): Promise<string> {
    return this.provider.generateContent(
      jobDescription,
      type,
      userInfo,
      apiKey || this.apiKey,
      modelName || this.modelName,
    );
  }

  async validateKey(key: string): Promise<boolean> {
    return validateGeminiKey(key);
  }
}
