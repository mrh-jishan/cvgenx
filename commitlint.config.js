module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',
                'fix',
                'docs',
                'chore',
                'style',
                'refactor',
                'ci',
                'test',
                'revert',
                'perf',
                'vercel',
            ],
        ],
        'body-max-line-length': [0, 'always', 0],
    },
};
