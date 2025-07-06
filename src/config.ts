import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import fs from 'fs/promises';

export function loadConfig() {
  const homeEnvPath = path.join(os.homedir(), '.cvgen.env');
  const localEnvPath = path.join(process.cwd(), '.env');
  fs.stat(homeEnvPath).then(() => dotenv.config({ path: homeEnvPath })).catch(() => {});
  dotenv.config({ path: localEnvPath });
}

export async function saveConfig(gemini: string, openai: string) {
  const homeEnvPath = path.join(os.homedir(), '.cvgen.env');
  let envContent = '';
  if (gemini) envContent += `GEMINI_API_KEY=${gemini}\n`;
  if (openai) envContent += `OPENAI_API_KEY=${openai}\n`;
  await fs.writeFile(homeEnvPath, envContent, { encoding: 'utf8' });
  return homeEnvPath;
}
