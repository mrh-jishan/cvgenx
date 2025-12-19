import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { db } from './db';
import { Provider, ContentType } from './ai';
import { PromptType, buildPrompt } from './ai/prompt';
import { DEFAULT_MODEL_NAME } from './constants';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

async function extractResumeText(file: Express.Multer.File): Promise<string> {
  if (!file) return '';
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    const parsed = await pdf(file.buffer);
    return parsed.text?.trim() || '';
  }
  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.originalname.toLowerCase().endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value?.trim() || '';
  }
  return file.buffer.toString('utf8').trim();
}

function normalizeResumeText(text: string): string {
  if (!text) return '';
  const squeezed = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
  return squeezed.slice(0, 12000);
}

function buildUserInfo(override?: any) {
  const savedConfig = db.getConfig();
  const baseUser = savedConfig.userInfo || {};
  return { ...baseUser, ...(override || {}) };
}

function mergeResumeText(resumes: { content: string }[], limit = 4000): string {
  const lines = resumes
    .flatMap((r) => (r.content || '').split('\n'))
    .map((l) => l.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const l of lines) {
    if (seen.has(l)) continue;
    seen.add(l);
    if (merged.join('\n').length + l.length > limit) break;
    merged.push(l);
  }
  return merged.join('\n');
}

export function createServer() {
  const app = express();

  app.set('view engine', 'ejs');
  const viewsPathOptions = [
    path.join(__dirname, '..', 'views'),
    path.join(__dirname, 'views'),
    path.join(process.cwd(), 'views'),
  ];
  const viewsDir = viewsPathOptions.find((p) => fs.existsSync(p)) || viewsPathOptions[0];
  app.set('views', viewsDir);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  const publicPathOptions = [
    path.join(__dirname, '..', 'public'),
    path.join(__dirname, 'public'),
    path.join(process.cwd(), 'public'),
  ];
  const publicDir = publicPathOptions.find((p) => fs.existsSync(p)) || publicPathOptions[0];
  app.use(express.static(publicDir));

  app.get('/', (_req, res) => {
    const config = db.getConfig();
    const resumes = db.listResumes(20);
    res.render('generator', {
      initialData: {
        page: 'generator',
        hasGeminiKey: Boolean(config.geminiApiKey),
        modelName: config.modelName || DEFAULT_MODEL_NAME,
        keyPreview: config.geminiApiKey ? `••••${config.geminiApiKey.slice(-4)}` : '',
        latestResume: db.getLatestResume() || null,
        resumes,
        results: [],
        history: db.listGenerations(10),
      },
    });
  });

  app.get('/settings', (_req, res) => {
    const config = db.getConfig();
    const resumes = db.listResumes(20);
    res.render('settings', {
      initialData: {
        page: 'settings',
        hasGeminiKey: Boolean(config.geminiApiKey),
        modelName: config.modelName || DEFAULT_MODEL_NAME,
        keyPreview: config.geminiApiKey ? `••••${config.geminiApiKey.slice(-4)}` : '',
        resumes,
        mergedResume: mergeResumeText(resumes),
      },
    });
  });

  app.get('/history', (_req, res) => {
    res.render('history', {
      initialData: {
        page: 'history',
        history: db.listGenerations(50),
      },
    });
  });

  // Legacy API endpoints (can be trimmed later)
  app.get('/api/config', (_req, res) => {
    const config = db.getConfig();
    res.json({
      hasGeminiKey: Boolean(config.geminiApiKey),
      modelName: config.modelName || DEFAULT_MODEL_NAME,
      keyPreview: config.geminiApiKey ? `••••${config.geminiApiKey.slice(-4)}` : '',
    });
  });

  // Rendered settings actions
  app.post('/settings/key', (req, res) => {
    const { geminiKey, modelName } = req.body as { geminiKey?: string; modelName?: string };
    db.saveConfig({ geminiApiKey: geminiKey, modelName });
    const config = db.getConfig();
    const resumes = db.listResumes(20);
    res.render('settings', {
      initialData: {
        page: 'settings',
        hasGeminiKey: Boolean(config.geminiApiKey),
        modelName: config.modelName || DEFAULT_MODEL_NAME,
        keyPreview: config.geminiApiKey ? `••••${config.geminiApiKey.slice(-4)}` : '',
        resumes,
        mergedResume: mergeResumeText(resumes),
        message: 'Key saved.',
      },
    });
  });

  // Generate via form submit
  app.post('/generate', upload.single('resume'), async (req, res) => {
    const type = (req.body.type as PromptType) || 'resume';
    const jobDescription = (req.body.jobDescription || '').toString();
    const resumeIdFromForm = req.body.resumeId ? Number(req.body.resumeId) : undefined;

    const allowedTypes: PromptType[] = ['resume', 'coverLetter', 'both'];
    if (!jobDescription || !type || !allowedTypes.includes(type)) {
      const config = db.getConfig();
      res.render('generator', {
        initialData: {
          page: 'generator',
          hasGeminiKey: Boolean(config.geminiApiKey),
          modelName: config.modelName || DEFAULT_MODEL_NAME,
          keyPreview: config.geminiApiKey ? `••••${config.geminiApiKey.slice(-4)}` : '',
          resumes: db.listResumes(20),
          latestResume: db.getLatestResume(),
          history: db.listGenerations(10),
          results: [],
          error: 'Type and job description are required.',
          type,
          jobDescription,
          selectedResumeId: resumeIdFromForm,
        },
      });
      return;
    }

    const config = db.getConfig();
    const apiKey = config.geminiApiKey;
    const modelName = config.modelName || DEFAULT_MODEL_NAME;
    if (!apiKey) {
      res.render('generator', {
        initialData: {
          page: 'generator',
          hasGeminiKey: false,
          modelName,
          keyPreview: '',
          resumes: db.listResumes(20),
          latestResume: db.getLatestResume(),
          history: db.listGenerations(10),
          results: [],
          error: 'Add your Gemini API key in Settings first.',
          type,
          jobDescription,
          selectedResumeId: resumeIdFromForm,
        },
      });
      return;
    }

    let resumeText = normalizeResumeText(req.body.resumeText || '');
    let resumeId = resumeIdFromForm;
    if (req.file) {
      resumeText = normalizeResumeText(await extractResumeText(req.file));
      resumeId = db.addResume(req.file.originalname, req.file.mimetype, resumeText);
    }
    if (!resumeText) {
      const fallback = resumeIdFromForm
        ? db.getResume(resumeIdFromForm)?.content
        : db.getLatestResume()?.content;
      resumeText = normalizeResumeText(fallback || '');
    }

    const userInfo = { ...buildUserInfo(), resumeText };
    const provider = new Provider(apiKey, modelName);

    const responses: { type: ContentType; content: string }[] = [];

    try {
      if (type === 'both') {
        const resumePrompt = buildPrompt(userInfo, jobDescription, 'resume', resumeText);
        const coverLetterPrompt = buildPrompt(userInfo, jobDescription, 'coverLetter', resumeText);
        const resumeContent = await provider.generateContent(resumePrompt, 'resume', userInfo);
        const coverLetterContent = await provider.generateContent(
          coverLetterPrompt,
          'coverLetter',
          userInfo,
        );
        responses.push({ type: 'resume', content: resumeContent });
        responses.push({ type: 'coverLetter', content: coverLetterContent });
        db.addGeneration('resume', jobDescription, resumeContent, resumeId);
        db.addGeneration('coverLetter', jobDescription, coverLetterContent, resumeId);
      } else {
        const content = await provider.generateContent(
          buildPrompt(userInfo, jobDescription, type, resumeText),
          type as ContentType,
          userInfo,
        );
        responses.push({ type: type as ContentType, content });
        db.addGeneration(type, jobDescription, content, resumeId);
      }
    } catch (err: any) {
      console.error(err);
      res.render('generator', {
        initialData: {
          page: 'generator',
          hasGeminiKey: Boolean(config.geminiApiKey),
          modelName,
          keyPreview: config.geminiApiKey ? `••••${config.geminiApiKey.slice(-4)}` : '',
          resumes: db.listResumes(20),
          latestResume: db.getLatestResume(),
          history: db.listGenerations(10),
          results: [],
          error: err?.message || 'Failed to generate content.',
          type,
          jobDescription,
          selectedResumeId: resumeId,
        },
      });
      return;
    }

    res.render('generator', {
      initialData: {
        page: 'generator',
        hasGeminiKey: Boolean(config.geminiApiKey),
        modelName,
        keyPreview: config.geminiApiKey ? `••••${config.geminiApiKey.slice(-4)}` : '',
        resumes: db.listResumes(20),
        latestResume: db.getLatestResume(),
        history: db.listGenerations(10),
        results: responses,
        success: 'Generated successfully.',
        jobDescription,
        selectedResumeId: resumeIdFromForm || resumeId,
        type,
      },
    });
  });

  // Download generated content as md/pdf/docx
  app.post('/download', async (req, res) => {
    const { format = 'md', filename = 'cvgenx', content = '' } = req.body;
    
    if (!content) {
      res.status(400).send('Missing content');
      return;
    }

    try {
      // Handle markdown download (no conversion needed)
      if (format === 'md') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.md"`);
        res.send(content);
        return;
      }

      // Import converter module for PDF and DOCX
      const { markdownToPdfBuffer, markdownToDocxBuffer } = await import('./converter');

      if (format === 'pdf') {
        const pdfBuffer = await markdownToPdfBuffer(content);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(pdfBuffer);
        return;
      }

      if (format === 'docx') {
        const docxBuffer = await markdownToDocxBuffer(content);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
        res.send(docxBuffer);
        return;
      }

      res.status(400).send('Invalid format. Use md, pdf, or docx');
    } catch (err) {
      console.error('Download error:', err);
      res.status(500).send('Download failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  });

  return app;
}

export function startServer(port = Number(process.env.PORT) || 4173) {
  const app = createServer();
  app.listen(port, () => {
    console.log(`cvgenx web is running at http://localhost:${port}`);
  });
}
