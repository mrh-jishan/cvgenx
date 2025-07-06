# cvgen

A CLI tool to generate tailored resumes and cover letters from a job description using Gemini (Google) or OpenAI (ChatGPT).

## Installation

Clone the repo and run:

```
npm install
```

## Configuration

You can store your API keys in either a `.env` file in your project or a global config at `~/.cvgen.env`.

- `GEMINI_API_KEY=your_google_gemini_api_key`
- `OPENAI_API_KEY=your_openai_api_key` (future support)

To set up config interactively, run:

```
cvgen --auth
```

## Usage

```
cvgen <job-description-file.txt> <type>
```

- `<type>`: `resume` or `coverLetter`

Example:

```
cvgen job_description.txt resume
cvgen job_description.txt coverLetter
```

## Features
- Loads API keys from either local or home config
- Interactive config setup with `--auth`
- Generates resume or cover letter using Gemini API

## License

MIT
