import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Provider, ContentType } from './ai';
import { PromptType, buildPrompt } from './ai/prompt';
import { USER_BASE_INFO as DEFAULT_USER_BASE_INFO } from './user-base-info';
import os from 'os';
import { editUserTemplate } from './user-template';
import { handleAuthFlow } from './auth-flow';
import readline from 'readline';
import { exec } from 'child_process';

function getUserTemplateExample(format: 'json' | 'yaml') {
  if (format === 'json') {
    return JSON.stringify(DEFAULT_USER_BASE_INFO, null, 2);
  } else {
    return yaml.dump(DEFAULT_USER_BASE_INFO);
  }
}

async function loadUserInfo() {
  // Always load from ~/.cvgenx.user.json for consistency
  const userFile = path.join(os.homedir(), '.cvgenx.user.json');
  try {
    const content = await fs.readFile(userFile, 'utf8');
    return JSON.parse(content);
  } catch {
    return DEFAULT_USER_BASE_INFO;
  }
}

async function getJobDescriptionFromStdin(): Promise<string> {
  console.log('Paste the job description below. Press Ctrl+D (or Ctrl+Z on Windows) when done:');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  let input = '';
  for await (const line of rl) {
    input += line + '\n';
  }
  rl.close();
  return input.trim();
}

async function convertMarkdownToFormat(mdFile: string, outFile: string, format: string) {
  if (format === 'pdf') {
    await new Promise((resolve, reject) => {
      exec(
        `npx md-to-pdf "${mdFile}" --pdf-options '{"format":"Letter","margin":"10mm","printBackground":true}' > "${outFile}"`,
        (err) => {
          if (err) reject(err);
          else resolve(undefined);
        },
      );
    });
  } else if (format === 'docx') {
    await new Promise((resolve, reject) => {
      exec(
        `pandoc "${mdFile}" -o "${outFile}" --from markdown --to docx --variable=geometry:margin=1in --variable=fontsize:12pt --variable=linestretch:1.2`,
        (err) => {
          if (err) reject(err);
          else resolve(undefined);
        },
      );
    });
  }
}

function showLoader(message: string) {
  const frames = ['|', '/', '-', '\\'];
  let i = 0;
  process.stdout.write(message);
  const interval = setInterval(() => {
    process.stdout.write(`\r${message} ${frames[(i = ++i % frames.length)]}`);
  }, 120);
  return () => {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(message.length + 2) + '\r');
  };
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
      choices: ['md', 'docx', 'pdf'],
      default: 'md',
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
    // Always read from ~/.cvgenx.user.json and convert to YAML if needed
    const userFile = path.join(os.homedir(), `.cvgenx.user.json`);
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
  let jobDescription: string;
  if (!jobDescriptionFilePath) {
    jobDescription = await getJobDescriptionFromStdin();
    if (!jobDescription) {
      console.log('No job description provided.');
      return;
    }
  } else {
    jobDescription = await fs.readFile(jobDescriptionFilePath, 'utf8');
  }

  const userInfo = await loadUserInfo();
  const provider = new Provider(argv.platform as 'gemini' | 'openai');
  const type = argv.type as PromptType;
  const outputFormat = argv['output-format'];

  // Helper to create a concise, safe file name
  function makeFileName(name: string, type: string, ext: string) {
    const safe = (str: string) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return [safe(name), type].filter(Boolean).join('-') + '.' + ext;
  }

  const outFormat = outputFormat;

  if (type === 'both') {
    const stopLoader = showLoader('Generating resume and cover letter with AI');
    const resumePrompt = buildPrompt(userInfo, jobDescription, 'resume');
    const coverLetterPrompt = buildPrompt(userInfo, jobDescription, 'coverLetter');
    const resumeContent = await provider.generateContent(resumePrompt, 'resume', userInfo);
    const coverLetterContent = await provider.generateContent(
      coverLetterPrompt,
      'coverLetter',
      userInfo,
    );
    stopLoader();
    const resumeMdFile = makeFileName(userInfo.name, 'resume', 'md');
    const coverLetterMdFile = makeFileName(userInfo.name, 'coverLetter', 'md');
    await fs.writeFile(resumeMdFile, resumeContent, { encoding: 'utf8' });
    await fs.writeFile(coverLetterMdFile, coverLetterContent, { encoding: 'utf8' });
    if (outFormat === 'pdf' || outFormat === 'docx') {
      const resumeOutFile = makeFileName(userInfo.name, 'resume', outFormat);
      const coverLetterOutFile = makeFileName(userInfo.name, 'coverLetter', outFormat);
      await convertMarkdownToFormat(resumeMdFile, resumeOutFile, outFormat);
      await convertMarkdownToFormat(coverLetterMdFile, coverLetterOutFile, outFormat);
      console.log(`Saved to ${resumeOutFile}`);
      console.log(`Saved to ${coverLetterOutFile}`);
    } else {
      console.log(`Saved to ${resumeMdFile}`);
      console.log(`Saved to ${coverLetterMdFile}`);
    }
  } else {
    const stopLoader = showLoader(`Generating ${type} with AI`);
    const prompt = buildPrompt(userInfo, jobDescription, type);
    const content = await provider.generateContent(prompt, type as ContentType, userInfo);
    stopLoader();
    const mdFile = makeFileName(userInfo.name, type, 'md');
    await fs.writeFile(mdFile, content, { encoding: 'utf8' });
    if (outFormat === 'pdf' || outFormat === 'docx') {
      const outFile = makeFileName(userInfo.name, type, outFormat);
      await convertMarkdownToFormat(mdFile, outFile, outFormat);
      console.log(`Saved to ${outFile}`);
    } else {
      console.log(`Saved to ${mdFile}`);
    }
  }
}
