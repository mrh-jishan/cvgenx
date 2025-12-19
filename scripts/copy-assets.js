#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pairs = [
  { src: path.join(__dirname, '..', 'views'), dest: path.join(__dirname, '..', 'dist', 'views') },
  { src: path.join(__dirname, '..', 'public'), dest: path.join(__dirname, '..', 'dist', 'public') },
];

for (const { src, dest } of pairs) {
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, dest, { recursive: true, force: true });
}
