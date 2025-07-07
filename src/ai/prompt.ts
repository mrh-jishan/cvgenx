export type PromptType = 'resume' | 'coverLetter' | 'both';

function getLinkText(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function buildPrompt(
  userInfo: any,
  jobDescription: string,
  type: PromptType,
): string {
  const resumePrompt = `
    You are an expert resume writer. Your goal is to create a resume that will guarantee an interview for the following job description.
    - The resume must start with a title/header in this exact format (using Markdown hyperlinks for the links):

    **${userInfo.name}**
    ${userInfo.address}\t
    ${userInfo.phone} | [${userInfo.email}](mailto:${userInfo.email})\t
    [${getLinkText(userInfo.linkedin)}](${userInfo.linkedin}) | [${getLinkText(userInfo.github)}](${userInfo.github}) | [${getLinkText(userInfo.portfolio)}](${userInfo.portfolio})

    - Carefully analyze the job description and extract all required and preferred skills, experience, and keywords.
    - Rewrite or fabricate the user's experience, skills, and achievements to perfectly match the job description, even if it means inventing plausible details.
    - Use strong action verbs, quantify results, and focus on impact.
    - The resume must be ATS-friendly, concise, and highly persuasive.
    - The writing style must be natural, human-like, and free of AI patterns.
    - Do not include any explanations, disclaimers, or comments about fabrication or tailoring. Only output the resume content itself.
    - Do not include any instructions, placeholders, or requests to add fabricated projects or sections. Only output the final, complete resume content.

    User Profile:
    Name: ${userInfo.name}
    Phone: ${userInfo.phone}
    Email: ${userInfo.email}
    LinkedIn: ${userInfo.linkedin}
    GitHub: ${userInfo.github}
    Portfolio: ${userInfo.portfolio}

    Education:
    ${(userInfo.education || []).map((e: string) => `- ${e}`).join('\n')}

    Projects:
    ${(userInfo.projects || []).map((p: any) => `- **${p.name}:** [${getLinkText(p.url)}](${p.url}) ${p.description}`).join('\n')}

    Job Description:
    \`\`\`
    ${jobDescription}
    \`\`\`

    Generate a resume with these sections:
    - Summary/Profile (tailored to the job, highlight relevant/fabricated experience)
    - Technical Skills (include all relevant skills from the JD)
    - Professional Experience:
    ${(userInfo.professionalExperience || []).map((e: string) => `- ${e}`).join('\n')}
    - Education
    - Projects (align with JD, fabricate if needed)
  `;

  const coverLetterPrompt = `
    You are an expert cover letter writer. Your task is to write a short, highly personalized, and persuasive cover letter that will guarantee an interview for the following job description.

    - Add today's date at the top.
    - Add a subject line: "Subject: Application for [Job Title] at [Company]" (extract from the job description if possible).
    - Analyze the job description and company values.
    - Use the user's background and experience (fabricate or reword as needed) to create a perfect fit for the role.
    - Express genuine enthusiasm for the company and position.
    - Directly address the key requirements and values from the job description.
    - End with a strong call to action for an interview.
    - Do not include a greeting; just the body.
    - End with a closing such as "Sincerely, ${userInfo.name}".

    User Profile (for context):
    Name: ${userInfo.name}
    Education: ${(userInfo.education || []).join('; ')}
    Key Projects: ${(userInfo.projects || []).map((p: any) => p.name).join(', ')}

    Job Description:
    \`\`\`
    ${jobDescription}
    \`\`\`
  `;

  if (type === 'resume') return resumePrompt;
  if (type === 'coverLetter') return coverLetterPrompt;
  throw new Error(`Unknown prompt type: ${type}`);
}
