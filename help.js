#!/usr/bin/env node
/**
 * @file This file:
 * This file 
    - splits terms and definitions into separate files based on the term.
    ...
 */

console.log(`
  This is a helpfile for the splitter script.

  This file:
  - splits terms and definitions into separate files based on the term.
  - This is done by creating a file for each term.
  - The file name is based on the term. The content of the file is one term plus the definition of the term.
  - The file path is added to the specs.json file so it is included in the index.html after render.
  - The original glossary file is not changed, but is removed as an entry“from the”specs.json.
  - f not exists the specs.json file is copied to specs.unsplit.json (one time back-up of “specs.json”).
  - he spec.json file will have multiple new entries, one entry per defined term.The file can grow large.
  `);