import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { saveConfig, saveUserTemplatePath } from './config';
import { Provider, ContentType } from './ai';
import { buildPrompt, PromptType } from './ai/prompt';
import { USER_BASE_INFO as DEFAULT_USER_BASE_INFO } from './user-base-info';
import os from 'os';
import { editUserTemplate } from './user-template';
import { askPlatform } from './platform-prompt';
import { handleAuthFlow } from './auth-flow';

function getUserTemplateExample(format: 'json' | 'yaml') {
  if (format === 'json') {
    return JSON.stringify(DEFAULT_USER_BASE_INFO, null, 2);
  } else {
    const yamlLib = require('js-yaml');
    return yamlLib.dump(DEFAULT_USER_BASE_INFO);
  }
}

async function loadUserInfo(userTemplatePath?: string) {
  if (!userTemplatePath) return DEFAULT_USER_BASE_INFO;
  const ext = path.extname(userTemplatePath).toLowerCase();
  const content = await fs.readFile(userTemplatePath, 'utf8');
  if (ext === '.json') return JSON.parse(content);
  if (ext === '.yaml' || ext === '.yml') return yaml.load(content);
  throw new Error('Unsupported user template format. Use .json or .yaml');
}

export async function mainCli() {
  const argv = await yargs(hideBin(process.argv))
    .usage(
      `Usage: $0 <job-description-file.txt> [options]\n\nExamples:\n  $0 job.txt --type resume\n  $0 job.txt --type coverLetter --platform openai\n  $0 job.txt --type both --user-template user.yaml\n  $0 --auth`,
    )
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
    .check((argv) => {
      if (
        !argv.auth &&
        !argv.type &&
        !argv['show-user-template'] &&
        argv['edit-user-template'] === undefined
      ) {
        throw new Error('Missing required argument: type');
      }
      return true;
    })
    .help()
    .epilog('For more info, see https://github.com/mrh-jishan/csvgen')
    .parse();

  if (argv.auth) {
    await handleAuthFlow();
    return;
  }

  if (argv['show-user-template'] !== undefined) {
    let format: 'json' | 'yaml' = 'json';
    if (argv['show-user-template'] === 'yaml') format = 'yaml';
    // Always read from ~/.cvgen.user.json and convert to YAML if needed
    const userFile = path.join(os.homedir(), `.cvgen.user.json`);
    try {
      const content = await fs.readFile(userFile, 'utf8');
      if (format === 'json') {
        console.log(content);
      } else {
        const userObj = JSON.parse(content);
        console.log(yaml.dump(userObj));
      }
    } catch {
      // Fallback to example
      console.log(getUserTemplateExample(format));
    }
    return;
  }

  if (argv['edit-user-template'] !== undefined) {
    const fileArg = argv['edit-user-template'];
    await editUserTemplate(fileArg && fileArg !== '' ? fileArg : undefined);
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
