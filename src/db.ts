import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface StoredConfig {
  geminiApiKey?: string;
  userInfo?: any;
  modelName?: string;
}

export interface ResumeRecord {
  id: number;
  filename: string;
  mime: string;
  content: string;
  createdAt: string;
}

export interface GenerationRecord {
  id: number;
  type: string;
  jobDescription: string;
  output: string;
  resumeId?: number | null;
  profileId?: number | null;
  createdAt: string;
}

export interface ProfileRecord {
  id: number;
  name: string;
  data: any;
  createdAt: string;
}

function ensureDataDir(): string {
  const dir = path.join(os.homedir(), '.cvgenx');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export class CvgenxDb {
  private db: any;

  constructor() {
    const dataDir = ensureDataDir();
    const dbPath = path.join(dataDir, 'cvgenx.db');
    const shouldReset = process.argv.includes('--reset-db') || process.env.CVGENX_RESET_DB === '1';
    if (shouldReset && fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS configs (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          gemini_api_key TEXT,
          user_info TEXT,
          model_name TEXT
        )`,
      )
      .run();
    this.addColumnIfMissing(
      'configs',
      'model_name',
      'ALTER TABLE configs ADD COLUMN model_name TEXT',
    );

    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS resumes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT,
          mime TEXT,
          content TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )`,
      )
      .run();

    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS generations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT,
          job_description TEXT,
          output TEXT,
          resume_id INTEGER,
          profile_id INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (resume_id) REFERENCES resumes(id),
          FOREIGN KEY (profile_id) REFERENCES profiles(id)
        )`,
      )
      .run();
    this.addColumnIfMissing(
      'generations',
      'profile_id',
      'ALTER TABLE generations ADD COLUMN profile_id INTEGER',
    );

    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          data TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )`,
      )
      .run();
  }

  getConfig(): StoredConfig {
    const row =
      this.db
        .prepare(`SELECT gemini_api_key, user_info, model_name FROM configs WHERE id = 1 LIMIT 1`)
        .get() || {};
    return {
      geminiApiKey: row.gemini_api_key,
      userInfo: row.user_info ? JSON.parse(row.user_info) : undefined,
      modelName: row.model_name,
    };
  }

  saveConfig(config: StoredConfig) {
    const existing = this.getConfig();
    const mergedUser = config.userInfo ?? existing.userInfo ?? {};
    const statement = this.db.prepare(
      `INSERT INTO configs (id, gemini_api_key, user_info, model_name)
       VALUES (1, @geminiApiKey, @userInfo, @modelName)
       ON CONFLICT(id) DO UPDATE SET gemini_api_key = excluded.gemini_api_key, user_info = excluded.user_info, model_name = excluded.model_name`,
    );
    statement.run({
      geminiApiKey: config.geminiApiKey ?? existing.geminiApiKey ?? '',
      userInfo: JSON.stringify(mergedUser),
      modelName: config.modelName ?? existing.modelName ?? '',
    });
  }

  addResume(filename: string, mime: string, content: string): number {
    const result = this.db
      .prepare(
        `INSERT INTO resumes (filename, mime, content)
         VALUES (@filename, @mime, @content)`,
      )
      .run({ filename, mime, content });
    return Number(result.lastInsertRowid);
  }

  getResume(id?: number): ResumeRecord | undefined {
    if (!id) return undefined;
    const row = this.db
      .prepare(
        `SELECT id, filename, mime, content, created_at as createdAt
         FROM resumes WHERE id = ? LIMIT 1`,
      )
      .get(id);
    return row as ResumeRecord | undefined;
  }

  getLatestResume(): ResumeRecord | undefined {
    const row = this.db
      .prepare(
        `SELECT id, filename, mime, content, created_at as createdAt
         FROM resumes
         ORDER BY datetime(created_at) DESC
         LIMIT 1`,
      )
      .get();
    return row as ResumeRecord | undefined;
  }

  listResumes(limit = 10): ResumeRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, filename, mime, content, created_at as createdAt
         FROM resumes
         ORDER BY datetime(created_at) DESC
         LIMIT ?`,
      )
      .all(limit);
    return rows as ResumeRecord[];
  }

  addGeneration(
    type: string,
    jobDescription: string,
    output: string,
    resumeId?: number,
    profileId?: number,
  ): number {
    const result = this.db
      .prepare(
        `INSERT INTO generations (type, job_description, output, resume_id, profile_id)
         VALUES (@type, @jobDescription, @output, @resumeId, @profileId)`,
      )
      .run({
        type,
        jobDescription,
        output,
        resumeId: resumeId ?? null,
        profileId: profileId ?? null,
      });
    return Number(result.lastInsertRowid);
  }

  listGenerations(limit = 25): GenerationRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, type, job_description as jobDescription, output, resume_id as resumeId, profile_id as profileId, created_at as createdAt
         FROM generations
         ORDER BY datetime(created_at) DESC
         LIMIT ?`,
      )
      .all(limit);
    return rows as GenerationRecord[];
  }

  getGeneration(id: number): GenerationRecord | undefined {
    if (!id) return undefined;
    const row = this.db
      .prepare(
        `SELECT id, type, job_description as jobDescription, output, resume_id as resumeId, profile_id as profileId, created_at as createdAt
         FROM generations
         WHERE id = ?
         LIMIT 1`,
      )
      .get(id);
    return row as GenerationRecord | undefined;
  }

  updateGeneration(id: number, output: string) {
    if (!id) return;
    this.db
      .prepare(`UPDATE generations SET output = @output WHERE id = @id`)
      .run({ id, output });
  }

  deleteGeneration(id: number) {
    if (!id) return;
    this.db.prepare(`DELETE FROM generations WHERE id = ?`).run(id);
  }

  addProfile(name: string, data: any): number {
    const result = this.db
      .prepare(
        `INSERT INTO profiles (name, data)
         VALUES (@name, @data)`,
      )
      .run({ name: name || 'Untitled profile', data: JSON.stringify(data || {}) });
    return Number(result.lastInsertRowid);
  }

  listProfiles(): ProfileRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, data, created_at as createdAt
         FROM profiles
         ORDER BY datetime(created_at) DESC`,
      )
      .all();
    return (rows || []).map((r: any) => ({ ...r, data: r.data ? JSON.parse(r.data) : {} }));
  }

  getProfile(id?: number): ProfileRecord | undefined {
    if (!id) return undefined;
    const row = this.db
      .prepare(
        `SELECT id, name, data, created_at as createdAt
         FROM profiles
         WHERE id = ?
         LIMIT 1`,
      )
      .get(id);
    if (!row) return undefined;
    return { ...row, data: row.data ? JSON.parse(row.data) : {} } as ProfileRecord;
  }

  private addColumnIfMissing(table: string, column: string, alterSql: string) {
    try {
      const info = this.db.prepare(`PRAGMA table_info(${table})`).all() as any[];
      const exists = info.some((c) => c.name === column);
      if (!exists) {
        this.db.prepare(alterSql).run();
      }
    } catch {
      // best-effort migration
    }
  }
}

export const db = new CvgenxDb();
