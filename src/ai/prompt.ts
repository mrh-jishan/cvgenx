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
    ${userInfo.address}     
    ${userInfo.phone} | [${userInfo.email}](mailto:${userInfo.email})    
    [${getLinkText(userInfo.linkedin)}](${userInfo.linkedin}) | [${getLinkText(userInfo.github)}](${userInfo.github}) | [${getLinkText(userInfo.portfolio)}](${userInfo.portfolio})

    - Carefully analyze the job description and extract all required and preferred skills, experience, and keywords.
    - **Bold all keywords, skills, and technologies from the job description wherever they appear in the resume to maximize ATS matching.**
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
    You are an expert cover letter writer. Your task is to write a highly professional, structured cover letter following the traditional three-paragraph format that will guarantee an interview.

    Format the cover letter with proper business letter formatting:
    - User's address at the top (${userInfo.address})
    - Today's date
    - Employer's contact information (extract from job description if available, otherwise use "Hiring Manager")
    - Professional salutation ("Dear [Name]" or "Dear Hiring Manager")

    Structure the letter with exactly three paragraphs:

    **First Paragraph - "Why Them?"**
    - State the specific position you are applying for and how you learned about it
    - Express genuine interest in the position and the organization
    - Include 2-3 sentences about why you want to work for their specific company (research-based insights about their mission, values, recent achievements, or industry reputation)
    - Avoid using exact wording from their website or job posting

    **Second Paragraph - "Why You?"**
    - Describe relevant skills gained through education, professional experience, projects, and activities
    - Highlight specific professional accomplishments that go above and beyond basic job responsibilities
    - Include quantifiable achievements where possible
    - Make sure skills and accomplishments align with the job requirements without explicitly stating the connection

    **Third Paragraph - "Why Together?"**
    - Explain why you and the employer would be a perfect fit
    - Connect your skills and accomplishments directly to their needs
    - Describe what you can offer them and what you hope to accomplish while working there
    - Include contact information and express appreciation
    - End with a professional closing

    Guidelines:
    - Use professional, confident tone
    - No placeholders, bracketed text, or example instructions
    - Fabricate or enhance experience as needed to match the role
    - Keep it to one page
    - End with "Sincerely," followed by ${userInfo.name}

    User Profile:
    Name: ${userInfo.name}
    Address: ${userInfo.address}
    Phone: ${userInfo.phone}
    Email: ${userInfo.email}
    Education: ${(userInfo.education || []).join('; ')}
    Key Projects: ${(userInfo.projects || []).map((p: any) => p.name).join(', ')}
    Professional Experience: ${(userInfo.professionalExperience || []).join('; ')}

    Job Description:
    \`\`\`
    ${jobDescription}
    \`\`\`
  `;

  if (type === 'resume') return resumePrompt;
  if (type === 'coverLetter') return coverLetterPrompt;
  throw new Error(`Unknown prompt type: ${type}`);
}
