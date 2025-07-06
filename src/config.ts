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

export async function saveConfig(gemini: string, openai: string, defaultPlatform: string) {
  const homeEnvPath = path.join(os.homedir(), '.cvgen.env');
  let envContent = '';
  if (gemini) envContent += `GEMINI_API_KEY=${gemini}\n`;
  if (openai) envContent += `OPENAI_API_KEY=${openai}\n`;
  if (defaultPlatform) envContent += `CVGEN_DEFAULT_PLATFORM=${defaultPlatform}\n`;
  await fs.writeFile(homeEnvPath, envContent, { encoding: 'utf8' });
  return homeEnvPath;
}

export async function getDefaultPlatform(): Promise<string | undefined> {
  const homeEnvPath = path.join(os.homedir(), '.cvgen.env');
  try {
    const envContent = await fs.readFile(homeEnvPath, 'utf8');
    for (const line of envContent.split('\n')) {
      if (line.startsWith('CVGEN_DEFAULT_PLATFORM=')) {
        return line.replace('CVGEN_DEFAULT_PLATFORM=', '').trim();
      }
    }
  } catch {}
  return undefined;
}
