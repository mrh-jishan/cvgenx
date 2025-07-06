export async function askPlatform(current: string, rl: any): Promise<string> {
  const options = ['gemini', 'openai'];
  const currentIdx = options.indexOf((current || 'gemini').toLowerCase());
  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log('Choose default platform:');
    options.forEach((opt, idx) => {
      const mark = idx === currentIdx ? '*' : ' ';
      console.log(`  ${idx + 1}. ${opt}${mark}`);
    });
    const ask = (q: string) => new Promise<string>(res => rl.question(q, res));
    let answer = await ask(`Enter number or name [${options[currentIdx]}]: `);
    answer = answer.trim().toLowerCase();
    if (!answer) return options[currentIdx];
    if (answer[0] === '1' || answer === 'gemini') return 'gemini';
    if (answer[0] === '2' || answer === 'openai') return 'openai';
    console.log('Invalid input. Please enter 1, 2, gemini, or openai.');
  }
}
