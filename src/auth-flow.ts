import { Provider } from './ai';
import { db } from './db';

export async function handleAuthFlow() {
  const existingGemini = db.getConfig().geminiApiKey || '';
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
  db.saveConfig({ geminiApiKey: gemini });
  console.log('API key saved. You can now generate resumes and cover letters.');
}
