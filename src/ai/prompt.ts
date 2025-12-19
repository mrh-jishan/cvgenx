export type PromptType = 'resume' | 'coverLetter' | 'both';

function getLinkText(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function buildPrompt(
  userInfo: any,
  jobDescription: string,
  type: PromptType,
  existingResume?: string,
): string {
  const existingResumeSection = existingResume
    ? `\n3. **Existing Resume (reference only; improve and tailor rather than copy):**\n\`\`\`\n${existingResume}\n\`\`\`\n`
    : '';

  const resumePrompt = `
**Role:** Act as an expert Senior Technical Recruiter and Resume Writer for the US Tech market.

**Task:** Create a highly targeted, "Hybrid" resume in Markdown format based on the Job Description (JD) and my provided background information.

**Goal:** The resume must pass ATS (Applicant Tracking Systems) and impress a Hiring Manager by specifically tailoring my experience to match the JD's requirements, bridging the gap between my different skill sets (e.g., Java Backend vs. Python/AI vs. Node.js).

**Inputs:**
1.  **Target Job Description:**
    \`\`\`
    ${jobDescription}
    \`\`\`

2.  **My Background:**
    Name: ${userInfo?.name || ''}
    Address: ${userInfo?.address || ''}
    Phone: ${userInfo?.phone || ''}
    Email: ${userInfo?.email || ''}
    LinkedIn: ${userInfo?.linkedin || ''}
    GitHub: ${userInfo?.github || ''}
    Portfolio: ${userInfo?.portfolio || ''}

    Education:
    ${(userInfo.education || []).map((e: string) => `- ${e}`).join('\n')}

    Projects:
    ${(userInfo.projects || []).map((p: any) => `- **${p.name}:** [${getLinkText(p.url)}](${p.url}) ${p.description}`).join('\n')}

    Professional Experience:
    ${(userInfo.professionalExperience || []).map((e: string) => `- ${e}`).join('\n')}
${existingResumeSection}

**Instructions:**
1.  **Keyword Analysis:** Analyze the JD for "hard requirements" (e.g., Java, Node.js, AWS, Kubernetes) and "soft skills" (e.g., Distributed Systems, Leadership, Mentorship).
2.  **Strategic Selection:**
    * If the job focuses on **Java/Backend**, prioritize my "Senior Software Engineer (Java)" experience and minimize the Python/Data Science details unless they are relevant to the specific role.
    * If the job focuses on **AI/Data**, bring my Master's degree and Python projects to the top.
    * If the job is **Full Stack/Node.js**, emphasize my Digilant and Cognizant Node.js work.
3.  **Gap Management:** If the JD asks for a skill I don't explicitly have (e.g., Swift), highlight the *adjacent* skill I do have (e.g., API Design for Mobile, React Native) that solves the same business problem.
4.  **Formatting Rules:**
    * Use clean, professional Markdown.
    * **Header:** Name, City/State, Phone, Email, LinkedIn, GitHub.
    * **Summary:** 3-4 lines. Hard-hitting. Mention years of experience and top 3 tech stacks relevant to *this* specific JD.
    * **Skills:** Group them logically (Languages, Cloud/DevOps, Databases).
    * **Experience:** Reverse chronological. Use strong action verbs (Architected, Engineered, Led, Optimized). **Quantify results** where possible (e.g., "Reduced costs by 25%", "Improved latency by 30%").
    * **Education:** Include my MS in CS (Expected 2026) and BS.
5.  **Location:** Ensure my location is listed as ${userInfo.address}. If the job is local to me, emphasize that advantage in the Summary.

**Output:** Provide *only* the resume code in Markdown.
`;

  const coverLetterPrompt = `
**Role:** Act as a Senior Software Engineer and Technical Writer.

**Task:** Write a highly personalized, technical cover letter for the following job.

**Goal:** The letter needs to sound human, conversational, and authoritative—not robotic or overly formal. It should directly address the engineering challenges mentioned in the job description using my actual experience.

**Inputs:**
1.  **Target Job Description:**
    \`\`\`
    ${jobDescription}
    \`\`\`
2.  **My Background:**
    Name: ${userInfo.name}
    Address: ${userInfo?.address || ''}
    Phone: ${userInfo?.phone || ''}
    Email: ${userInfo?.email || ''}
    Education: ${(userInfo.education || []).join('; ')}
    Key Projects: ${(userInfo.projects || []).map((p: any) => p.name).join(', ')}
    Professional Experience: ${(userInfo.professionalExperience || []).join('; ')}
3.  **My Location:** ${userInfo?.address || ''} (Mention this if the job is in South Florida/Tamarac/Fort Lauderdale).
${existingResumeSection}

**Writing Guidelines (Strictly Follow These):**
1.  **The "Hook":** Do not start with "I am writing to apply..." Start with a sentence that shows I understand *why* the role is hard or interesting (e.g., "The challenge of maintaining safety and liveness in a distributed cluster is what draws me to this role...").
2.  **The "Bridge":** Connect my "Hard Engineering" background (Java, Spring Boot, Distributed Systems) with my current "Academic/Data" focus (MS in CS, Python, AI). Explain how this mix makes me unique for this specific role.
3.  **Specific Technical Proof:** Do not just list skills. Describe *how* I used them to solve a problem relevant to this job.
    * *Example:* Instead of "I know SQL," say "I am currently leading a MySQL 6 to 8 upgrade using Terraform state imports to ensure zero data loss."
    * *Example:* Instead of "I know AWS," say "I engineered an EC2 scheduling solution using Lambda and SSM that cut costs by 25%."
4.  **Tone:** Professional but conversational. Use terms like "under the hood," "pain points," "race conditions," or "trade-offs."
5.  **Address Gaps:** If the job asks for a skill I don't feature heavily (like Swift or Python), explain how my adjacent experience (API Architecture or Data Modeling) bridges that gap.

**Structure:**
* **Salutation:** To the [Team Name] Team (or Hiring Manager if known).
* **Para 1:** The Hook & Why I want *this* specific job.
* **Para 2:** Deep dive into my relevant experience (Backend/Distributed Systems/Cloud).
* **Para 3:** Connect to my MS degree or specific project (Legacy migration, AI, etc.) relevant to the JD.
* **Closing:** Confident call to action.

**Output:** Provide the cover letter text only.
`;

  if (type === 'resume') return resumePrompt;
  if (type === 'coverLetter') return coverLetterPrompt;
  throw new Error(`Unknown prompt type: ${type}`);
}
