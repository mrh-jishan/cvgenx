import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { saveConfig } from './config';
import { generateGeminiContent, ContentType } from './ai/gemini';
import { generateOpenAIContent } from './ai/openai';
import { USER_BASE_INFO as DEFAULT_USER_BASE_INFO } from './user-base-info';

async function loadUserInfo(userTemplatePath?: string) {
  if (!userTemplatePath) return DEFAULT_USER_BASE_INFO;
  const ext = path.extname(userTemplatePath).toLowerCase();
  const content = await fs.readFile(userTemplatePath, 'utf8');
  if (ext === '.json') return JSON.parse(content);
  if (ext === '.yaml' || ext === '.yml') return yaml.load(content);
  throw new Error('Unsupported user template format. Use .json or .yaml');
}

export async function mainCli() {
  const args = process.argv.slice(2);
  let userTemplatePath: string | undefined;
  // ...existing code...
  // Parse CLI args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user-template' && args[i+1]) {
      userTemplatePath = args[i+1];
      i++;
    }
    // ...existing code...
  }
  // ...existing code...
  const userInfo = await loadUserInfo(userTemplatePath);
  // Pass userInfo to generateGeminiContent/generateOpenAIContent as needed
  // ...existing code...
}