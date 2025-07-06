import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { saveConfig } from './config';
import { Provider, ContentType } from './ai';
import { buildPrompt, PromptType } from './ai/prompt';
import { USER_BASE_INFO as DEFAULT_USER_BASE_INFO } from './user-base-info';

function getUserTemplateExample(format: 'json' | 'yaml') {
  if (format === 'json') {
    return JSON.stringify(DEFAULT_USER_BASE_INFO, null, 2);
  } else {
    const yamlLib = require('js-yaml');
    return yamlLib.dump(DEFAULT_USER_BASE_INFO);
  }
}

async function editUserTemplate(filePath: string) {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string, def: string) => new Promise<string>(res => rl.question(`${q} [${def}]: `, (ans) => res(ans || def)));
  let user = { ...DEFAULT_USER_BASE_INFO };
  user.name = await ask('Name', user.name);
  user.phone = await ask('Phone', user.phone);
  user.email = await ask('Email', user.email);
  user.linkedin = await ask('LinkedIn', user.linkedin);
  user.github = await ask('GitHub', user.github);
  user.portfolio = await ask('Portfolio', user.portfolio);
  // For education and projects, just keep default for now (could be extended)
  rl.close();
  const ext = path.extname(filePath).toLowerCase();
  let content = '';
  if (ext === '.json') content = JSON.stringify(user, null, 2);
  else if (ext === '.yaml' || ext === '.yml') content = require('js-yaml').dump(user);
  else throw new Error('Unsupported file format. Use .json or .yaml');
  await fs.writeFile(filePath, content, { encoding: 'utf8' });
  console.log(`User template saved to ${filePath}`);
}

async function loadUserInfo(userTemplatePath?: string) {
  if (!userTemplatePath) return DEFAULT_USER_BASE_INFO;
  const ext = path.extname(userTemplatePath).toLowerCase();
  const content = await fs.readFile(userTemplatePath, 'utf8');
  if (ext === '.json') return JSON.parse(content);
  if (ext === '.yaml' || ext === '.yml') return yaml.load(content);
  throw new Error('Unsupported user template format. Use .json or .yaml');
}

async function askPlatform(current: string, rl: any): Promise<string> {
  const options = ['gemini', 'openai'];
  const currentIdx = options.indexOf((current || 'gemini').toLowerCase());
  while (true) {
    console.log('Choose default platform:');
    options.forEach((opt, idx) => {
      const mark = idx === currentIdx ? '*' : ' ';
      console.log(`  ${idx + 1}. ${opt}${mark}`);
    });
    const ask = (q: string) => new Promise<string>(res => rl.question(q, res));
    let answer = await ask(`Enter number or name [${options[currentIdx]}]: `);
    answer = answer.trim().toLowerCase();
    if (!answer) return options[currentIdx];
    if (answer[0] === '1' || answer === 'gemini') return 'gemini';
    if (answer[0] === '2' || answer === 'openai') return 'openai';
    console.log('Invalid input. Please enter 1, 2, gemini, or openai.');
  }
}

async function validateGeminiKey(key: string): Promise<boolean> {
  if (!key) return true;
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] })
    });
    return res.status === 200 || res.status === 400; // 400 means bad prompt, but key is valid
  } catch {
    return false;
  }
}

async function validateOpenAIKey(key: string): Promise<boolean> {
  if (!key) return true;
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function mainCli() {
  const argv = await yargs(hideBin(process.argv))
    .usage(`Usage: $0 <job-description-file.txt> [options]\n\nExamples:\n  $0 job.txt --type resume\n  $0 job.txt --type coverLetter --platform openai\n  $0 job.txt --type both --user-template user.yaml\n  $0 --auth`)
    .option('type', {
      alias: 't',
      describe: 'Type of content to generate',
      choices: ['resume', 'coverLetter', 'both'],
      type: 'string',
    })
    .option('platform', {
      alias: 'p',
      describe: 'AI platform to use',
      choices: ['gemini', 'openai'],
      default: 'gemini',
      type: 'string',
    })
    .option('output-format', {
      alias: 'o',
      describe: 'Output file format',
      choices: ['txt', 'docx', 'pdf'],
      default: 'txt',
      type: 'string',
    })
    .option('user-template', {
      alias: 'u',
      describe: 'Path to user info template (json/yaml)',
      type: 'string',
    })
    .option('auth', {
      describe: 'Setup API keys interactively',
      type: 'boolean',
    })
    .option('show-user-template', {
      describe: 'Show example user template (json or yaml)',
      choices: ['json', 'yaml'],
      type: 'string',
      coerce: (val: any) => (val === '' || val === undefined ? 'json' : val),
    })
    .option('edit-user-template', {
      describe: 'Create or update a user template file interactively',
      type: 'string',
    })
    .check(argv => {
      if (!argv.auth && !argv.type && !argv['show-user-template'] && !argv['edit-user-template']) {
        throw new Error('Missing required argument: type');
      }
      return true;
    })
    .help()
    .epilog('For more info, see https://github.com/mrh-jishan/csvgen')
    .parse();

  if (argv.auth) {
    // Load existing config if present
    const os = await import('os');
    const path = await import('path');
    const fs = await import('fs/promises');
    const homeEnvPath = path.join(os.homedir(), '.cvgen.env');
    let existingGemini = '';
    let existingOpenai = '';
    let existingPlatform = '';
    try {
      const envContent = await fs.readFile(homeEnvPath, 'utf8');
      for (const line of envContent.split('\n')) {
        if (line.startsWith('GEMINI_API_KEY=')) existingGemini = line.replace('GEMINI_API_KEY=', '').trim();
        if (line.startsWith('OPENAI_API_KEY=')) existingOpenai = line.replace('OPENAI_API_KEY=', '').trim();
        if (line.startsWith('CVGEN_DEFAULT_PLATFORM=')) existingPlatform = line.replace('CVGEN_DEFAULT_PLATFORM=', '').trim();
      }
    } catch {}
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string, def: string) => new Promise<string>(res => rl.question(`${q}${def ? ` [${def}]` : ''}: `, (ans) => res(ans || def)));
    let gemini = '';
    while (true) {
      gemini = await ask('Enter your Gemini API key', existingGemini);
      if (!gemini || await validateGeminiKey(gemini)) break;
      console.log('Invalid Gemini API key. Please try again.');
    }
    let openai = '';
    while (true) {
      openai = await ask('Enter your OpenAI API key', existingOpenai);
      if (!openai || await validateOpenAIKey(openai)) break;
      console.log('Invalid OpenAI API key. Please try again.');
    }
    let defaultPlatform = await askPlatform(existingPlatform || 'gemini', rl);
    rl.close();
    await saveConfig(gemini, openai, defaultPlatform);
    console.log('API keys and default platform saved. You can now generate resumes and cover letters.');
    return;
  }

  if (argv['show-user-template'] !== undefined) {
    let format: 'json' | 'yaml' = 'json';
    if (argv['show-user-template'] === 'yaml') format = 'yaml';
    console.log(getUserTemplateExample(format));
    return;
  }

  if (argv['edit-user-template']) {
    await editUserTemplate(argv['edit-user-template']);
    return;
  }

  const jobDescriptionFilePath = argv._[0] as string;
  if (!jobDescriptionFilePath) {
    console.log('Please provide a job description file.');
    return;
  }

  const userInfo = await loadUserInfo(argv['user-template']);
  const provider = new Provider(argv.platform as 'gemini' | 'openai');
  const jobDescription = await fs.readFile(jobDescriptionFilePath, 'utf8');
  const type = argv.type as PromptType;
  const outputFormat = argv['output-format'];

  if (type === 'both') {
    for (const t of ['resume', 'coverLetter'] as ContentType[]) {
      const content = await provider.generateContent(jobDescription, t, userInfo);
      const outFile = `${t}.${outputFormat}`;
      await fs.writeFile(outFile, content, { encoding: 'utf8' });
      console.log(`Saved to ${outFile}`);
    }
  } else {
    const content = await provider.generateContent(jobDescription, type as ContentType, userInfo);
    const outFile = `${type}.${outputFormat}`;
    await fs.writeFile(outFile, content, { encoding: 'utf8' });
    console.log(`Saved to ${outFile}`);
  }
}
