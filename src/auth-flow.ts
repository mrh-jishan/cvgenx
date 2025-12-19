import { saveConfig } from './config';
import { Provider } from './ai';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export async function handleAuthFlow() {
  // Load existing config if present
  const homeEnvPath = path.join(os.homedir(), '.cvgenx.env');
  let existingGemini = '';
  try {
    const envContent = await fs.readFile(homeEnvPath, 'utf8');
    for (const line of envContent.split('\n')) {
      if (line.startsWith('GEMINI_API_KEY='))
        existingGemini = line.replace('GEMINI_API_KEY=', '').trim();
    }
  } catch {
    // ignore missing config file
  }
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string, def: string) =>
    new Promise<string>((res) =>
      rl.question(`${q}${def ? ` [${def}]` : ''}: `, (ans) => res(ans || def)),
    );
  let gemini = '';
  const geminiProvider = new Provider();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    gemini = await ask('Enter your Gemini API key', existingGemini);
    if (!gemini || (await geminiProvider.validateKey(gemini))) break;
    console.log('Invalid Gemini API key. Please try again.');
  }
  rl.close();
  await saveConfig(gemini);
  console.log(
    'API key saved. You can now generate resumes and cover letters.',
  );
}
