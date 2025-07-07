import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { DEFAULT_USER_BASE_INFO } from './user-base-info';
import yaml from 'js-yaml';

export async function editUserTemplate(filePath?: string) {
  const { saveUserTemplatePath } = await import('./config');
  const readline = await import('readline');
  const userFile = path.join(os.homedir(), `.cvgenx.user.json`);
  if (filePath) {
    // Always convert to JSON and save as ~/.cvgenx.user.json
    const ext = path.extname(filePath).toLowerCase();
    const content = await fs.readFile(filePath, 'utf8');
    let userObj: any;
    if (ext === '.json') {
      userObj = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      userObj = yaml.load(content);
    } else {
      throw new Error('Unsupported file format. Use .json or .yaml');
    }
    await fs.writeFile(userFile, JSON.stringify(userObj, null, 2), { encoding: 'utf8' });
    await saveUserTemplatePath(userFile);
    console.log(
      `Copied ${filePath} to ${userFile} (converted to JSON) and set as default user template.`,
    );
    return;
  }
  // Interactive prompt for all fields
  let user: any = { ...DEFAULT_USER_BASE_INFO };
  // Load existing if file exists
  try {
    const content = await fs.readFile(userFile, 'utf8');
    const loaded = JSON.parse(content);
    if (loaded) user = { ...user, ...loaded };
  } catch {
    // ignore missing user file
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string, def: string) =>
    new Promise<string>((res) => rl.question(`${q} [${def}]: `, (ans) => res(ans || def)));
  user.name = await ask('Name', user.name);
  user.phone = await ask('Phone', user.phone);
  user.email = await ask('Email', user.email);
  user.linkedin = await ask('LinkedIn', user.linkedin);
  user.github = await ask('GitHub', user.github);
  user.portfolio = await ask('Portfolio', user.portfolio);
  user.address = await ask('Address', user.address || '');

  // Show and prompt for education
  if (user.education && Array.isArray(user.education) && user.education.length) {
    console.log('Current education:');
    user.education.forEach((e: string) => console.log('  ' + e));
  }
  console.log('Enter education (multi-line, press Enter twice to finish):');
  const educationLines: string[] = [];
  await new Promise<void>((resolve) => {
    rl.prompt();
    rl.on('line', (line) => {
      if (line.trim() === '' && educationLines.length > 0) {
        resolve();
      } else {
        educationLines.push(line);
      }
    });
  });
  user.education = educationLines.filter(Boolean).length
    ? educationLines.filter(Boolean)
    : user.education;

  // Show and prompt for projects
  if (user.projects && Array.isArray(user.projects) && user.projects.length) {
    console.log('Current projects:');
    user.projects.forEach((p: any) => {
      if (typeof p === 'object') {
        // Show as JSON or readable string
        if (p.name && p.url && p.description) {
          console.log(`  ${p.name} | ${p.url} | ${p.description}`);
        } else {
          console.log('  ' + JSON.stringify(p));
        }
      } else {
        console.log('  ' + p);
      }
    });
  }
  console.log('Enter projects (multi-line, press Enter twice to finish):');
  const projectLines: string[] = [];
  await new Promise<void>((resolve) => {
    rl.prompt();
    rl.on('line', (line) => {
      if (line.trim() === '' && projectLines.length > 0) {
        resolve();
      } else {
        projectLines.push(line);
      }
    });
  });
  user.projects = projectLines.filter(Boolean).length
    ? projectLines.filter(Boolean)
    : user.projects;

  // Show and prompt for professional experience
  if (
    user.professionalExperience &&
    Array.isArray(user.professionalExperience) &&
    user.professionalExperience.length
  ) {
    console.log('Current professional experience:');
    user.professionalExperience.forEach((e: string) => console.log('  ' + e));
  }
  console.log('Enter professional experience (multi-line, press Enter twice to finish):');
  const experienceLines: string[] = [];
  await new Promise<void>((resolve) => {
    rl.prompt();
    rl.on('line', (line) => {
      if (line.trim() === '' && experienceLines.length > 0) {
        resolve();
      } else {
        experienceLines.push(line);
      }
    });
  });
  user.professionalExperience = experienceLines.filter(Boolean).length
    ? experienceLines.filter(Boolean)
    : user.professionalExperience;

  user.baseSummary = await ask('Base summary', user.baseSummary || '');
  rl.close();
  await fs.writeFile(userFile, JSON.stringify(user, null, 2), { encoding: 'utf8' });
  await saveUserTemplatePath(userFile);
  console.log(`User template saved to ${userFile}`);
  console.log(`Default user template set to ${userFile}`);
}
