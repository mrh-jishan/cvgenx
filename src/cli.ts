import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Provider, ContentType } from './ai';
import { PromptType, buildPrompt } from './ai/prompt';
import { handleAuthFlow } from './auth-flow';
import readline from 'readline';
import { exec, spawn } from 'child_process';
import { db } from './db';
import { DEFAULT_MODEL_NAME } from './constants';

function showLoader(message: string) {
  const frames = ['|', '/', '-', '\\'];
  let i = 0;
  process.stdout.write(message);
  const interval = setInterval(() => {
    process.stdout.write(`\r${message} ${frames[(i = ++i % frames.length)]}`);
  }, 120);
  return function stopLoader() {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(message.length + 2) + '\r');
  };
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
      const outStream = createWriteStream(outFile);

      const proc = spawn('npx', [
        'md-to-pdf',
        mdFile,
        '--pdf-options',
        '{"format":"Letter","margin":"10mm","printBackground":true}'
      ], {
        stdio: ['inherit', 'pipe', 'inherit'] // send stdout to us, keep stderr live
      });

      proc.stdout.pipe(outStream);

      proc.on('error', reject);

      proc.on('close', (code) => {
        if (code === 0) resolve(undefined);
        else reject(new Error(`md-to-pdf failed with code ${code}`));
      });
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

function makeFileName(name: string, type: string, ext: string) {
  const safe = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return [safe(name), type, getShortTimestamp()].filter(Boolean).join('-') + '.' + ext;
}

function getShortTimestamp() {
  // Use last 4 digits: MMSS (minute and second)
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return pad(now.getMinutes()) + pad(now.getSeconds());
}

export async function mainCli() {
  const argv = await yargs(hideBin(process.argv))
    .usage(
      `Usage: $0 <job-description-file.txt> [options]\n\nExamples:\n  $0 job.txt --type resume\n  $0 job.txt --type coverLetter\n  $0 job.txt --type both\n  $0 --auth`,
    )
    .option('type', {
      alias: 't',
      describe: 'Type of content to generate',
      choices: ['resume', 'coverLetter', 'both'],
      type: 'string',
    })
    .option('output-format', {
      alias: 'o',
      describe: 'Output file format',
      choices: ['md', 'docx', 'pdf'],
      default: 'md',
      type: 'string',
    })
    .option('auth', {
      describe: 'Setup API keys interactively',
      type: 'boolean',
    })
    .check((argv) => {
      if (
        !argv.auth &&
        !argv.type
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

  const config = db.getConfig();
  const userInfo = config.userInfo || {};
  const provider = new Provider(config.geminiApiKey, config.modelName || DEFAULT_MODEL_NAME);
  if (!config.geminiApiKey) {
    console.log('Gemini API key is not set. Please open the web UI and save it under Settings.');
    return;
  }
  const type = argv.type as PromptType;
  const outputFormat = argv['output-format'];

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
    const resumeMdFile = makeFileName(userInfo.name || 'cvgenx', 'resume', 'md');
    const coverLetterMdFile = makeFileName(userInfo.name || 'cvgenx', 'coverLetter', 'md');
    await fs.writeFile(resumeMdFile, resumeContent, { encoding: 'utf8' });
    await fs.writeFile(coverLetterMdFile, coverLetterContent, { encoding: 'utf8' });
    if (outputFormat === 'pdf' || outputFormat === 'docx') {
      const resumeOutFile = makeFileName(userInfo.name || 'cvgenx', 'resume', outputFormat);
      const coverLetterOutFile = makeFileName(userInfo.name || 'cvgenx', 'coverLetter', outputFormat);
      await convertMarkdownToFormat(resumeMdFile, resumeOutFile, outputFormat);
      await convertMarkdownToFormat(coverLetterMdFile, coverLetterOutFile, outputFormat);
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
    const mdFile = makeFileName(userInfo.name || 'cvgenx', type, 'md');
    await fs.writeFile(mdFile, content, { encoding: 'utf8' });
    if (outputFormat === 'pdf' || outputFormat === 'docx') {
      const outFile = makeFileName(userInfo.name, type, outputFormat);
      await convertMarkdownToFormat(mdFile, outFile, outputFormat);
      console.log(`Saved to ${outFile}`);
    } else {
      console.log(`Saved to ${mdFile}`);
    }
  }
}
