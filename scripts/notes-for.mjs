// Prints the newest PATCHNOTES.md section for one edition (used by the release workflow): node scripts/notes-for.mjs kirb
import fs from 'node:fs';
import { topFor } from '../src/notesfilter.js';
const id = process.argv[2] || 'public', t = topFor(fs.readFileSync(new URL('../PATCHNOTES.md', import.meta.url), 'utf8'), id);
if (t) process.stdout.write(t.replace(/^## .*/, "## What's new") + '\n');
