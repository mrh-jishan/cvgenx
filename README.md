# cvgenx

A CLI tool to generate tailored resumes and cover letters from a job description using Gemini (Google) or OpenAI (ChatGPT).

## Installation

Clone the repo and run:

```
npm install
```

## Configuration

You can store your API keys in either a `.env` file in your project or a global config at `~/.cvgenx.env`.

- `GEMINI_API_KEY=your_google_gemini_api_key`
- `OPENAI_API_KEY=your_openai_api_key`

To set up config interactively (with validation and default platform selection), run:

```
npx cvgenx --auth
```
- You will be prompted for your Gemini and OpenAI API keys (with validation).
- You can choose your default platform (Gemini or OpenAI) interactively.
- You can re-run this command anytime to update your keys or default platform.

## Usage

```
npx cvgenx <job-description-file.txt> --type <resume|coverLetter|both> [options]
```

### Example:

```
npx cvgenx job_description.txt --type resume
npx cvgenx job_description.txt --type coverLetter --platform openai
npx cvgenx job_description.txt --type both --user-template my-user.json
```

## User Template Example

To view the default user template in JSON:
```
npx cvgenx --show-user-template json
```
To view the default user template in YAML:
```
npx cvgenx --show-user-template yaml
```
To save the template to a file for editing:
```
npx cvgenx --show-user-template json > my-user.json
# or
npx cvgenx --show-user-template yaml > my-user.yaml
```
Edit the file as needed, then use it with the CLI:
```
npx cvgenx job.txt --type resume --user-template my-user.json
```

## User Template Management

### Interactive Editing

To interactively create or update your default user template:
```sh
npx cvgenx --edit-user-template
```
- This will prompt you for all fields and save the result to `~/.cvgenx.user.json`.
- If the file already exists, your current values will be shown and you can update them.

### Using an Existing File

To set an existing file as your default user template:
```sh
npx cvgenx --edit-user-template my-user.json
# or
npx cvgenx --edit-user-template my-user.yaml
```
- This will copy the file to your home directory as `~/.cvgenx.user.json` (converting from YAML if needed).
- The CLI will always use this file as your default user info.
- Only `~/.cvgenx.user.json` is used as the source of truth. No YAML file is created in your home directory.

### Showing Your User Template

To view your current default user template in JSON:
```sh
npx cvgenx --show-user-template json
```
To view it in YAML (converted on the fly from JSON):
```sh
npx cvgenx --show-user-template yaml
```

### Best Practice

- **Keep only one default user template file**: The CLI always uses the file at `~/.cvgenx.user.json`.
- If you want to switch formats, use the `--edit-user-template` command with the new file, and the CLI will update your default (always as JSON).
- Avoid editing both files at once; always use the one set as default.

## Features
- Loads API keys from either local or home config
- Interactive config setup with `--auth` (with validation and platform selection)
- Generates resume or cover letter using Gemini or OpenAI
- Supports user info templates in JSON or YAML
- Interactive user template editing (education, projects, summary)

## License

MIT
