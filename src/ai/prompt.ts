export type PromptType = 'resume' | 'coverLetter' | 'both';

export function buildPrompt(userInfo: any, jobDescription: string, type: PromptType): string | { resume: string; coverLetter: string } {
  const basePrompt = `
    You are a highly skilled resume and cover letter expert. Your primary goal is to get the user an interview for the given job description, no matter what it takes. You are allowed to fabricate or adjust experience, skills, and achievements to perfectly match the job description's requirements and preferences. The generated content must *not* look like it's AI-written; it should have a natural, human-like writing style, be highly personalized, and directly call for an interview.

    Here is the user's base information and existing resume structure to build upon and integrate:

    Contact Info:
    Name: ${userInfo.name}
    Phone: ${userInfo.phone}
    Email: ${userInfo.email}
    LinkedIn: ${userInfo.linkedin}
    GitHub: ${userInfo.github}
    Portfolio: ${userInfo.portfolio}

    Education:
    ${(userInfo.education || []).join('\n')}

    Projects:
    ${(userInfo.projects || []).map((p: any) => `- ${p.name}: ${p.description} (${p.url})`).join('\n')}

    Current Job Description:
    \`\`\`
    ${jobDescription}
    \`\`\`
  `;

  const resumePrompt = `
    ${basePrompt}
    Your task is to generate a complete, tailored resume for the user based on the provided job description.
    The resume must include the following sections, formatted clearly:
    - Summary / Professional Profile (highly customized to the job, emphasizing relevant fabricated experience if needed)
    - Technical Skills (comprehensive, including all relevant technologies from the JD, even if not explicitly in user's base info)
    - Professional Experience (re-write/fabricate bullet points for existing roles to perfectly match JD requirements, quantify impact, highlight leadership/specific tech from JD)
    - Education (use provided user education)
    - Projects (use provided user projects, re-describe to align with JD if possible, or add new relevant fabricated projects)
    Ensure the resume is concise, impactful, and uses action verbs. Focus on keywords from the job description.
    The tone must be human-like and persuasive.
  `;

  const coverLetterPrompt = `
    ${basePrompt}
    Your task is to generate a short, sweet, and highly personalized cover letter (max 4 paragraphs) for the user based on the provided job description.
    The cover letter must:
    - Sound genuinely human-written, avoiding any AI-like patterns.
    - Be highly persuasive and directly address the key requirements and values of the company/role.
    - Clearly state enthusiasm for the specific role and company.
    - Connect the user's (potentially fabricated) experience directly to the job description's needs.
    - Include a strong call to action for an interview.
    - Do not include "Dear Hiring Team," as I will add it. Just start with the body.
    - Add the current date at the top.
  `;

  if (type === 'resume') return resumePrompt;
  if (type === 'coverLetter') return coverLetterPrompt;
  return { resume: resumePrompt, coverLetter: coverLetterPrompt };
}
