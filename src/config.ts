import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import fs from 'fs/promises';

export function loadConfig() {
  const homeEnvPath = path.join(os.homedir(), '.cvgenx.env');
  const localEnvPath = path.join(process.cwd(), '.env');
  fs.stat(homeEnvPath)
    .then(() => dotenv.config({ path: homeEnvPath }))
    .catch(() => {});
  dotenv.config({ path: localEnvPath });
}

export async function saveConfig(gemini: string) {
  const homeEnvPath = path.join(os.homedir(), '.cvgenx.env');
  let envContent = '';
  if (gemini) envContent += `GEMINI_API_KEY=${gemini}\n`;
  await fs.writeFile(homeEnvPath, envContent, { encoding: 'utf8' });
  return homeEnvPath;
}

export async function saveUserTemplatePath(path: string) {
  const envPath = os.homedir() + '/.cvgenx.env';
  let envContent = '';
  try {
    envContent = await fs.readFile(envPath, 'utf8');
    envContent = envContent.replace(/USER_TEMPLATE_PATH=.*/g, '');
  } catch {
    // ignore missing config file
  }
  envContent +=
    (envContent && !envContent.endsWith('\n') ? '\n' : '') + `USER_TEMPLATE_PATH=${path}\n`;
  await fs.writeFile(envPath, envContent, { encoding: 'utf8' });
}

export async function getUserTemplatePath(): Promise<string | undefined> {
  const envPath = os.homedir() + '/.cvgenx.env';
  try {
    const envContent = await fs.readFile(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      if (line.startsWith('USER_TEMPLATE_PATH=')) {
        return line.replace('USER_TEMPLATE_PATH=', '').trim();
      }
    }
  } catch {
    // ignore missing config file
  }
  return undefined;
}
