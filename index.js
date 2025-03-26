#!/usr/bin/env node

/**
 * @file This file:
 *  - Splits terms and definitions into separate files based on the term.
 *  - Prompts the user interactively for input file and output directory.
 * @author Kor Dwarshuis
 * @version 1.0.0
 * @since 2024-06-10
 */

const fs = require('fs');
const path = require('path');
const fixContent = require('./fix-content.js');
const readline = require('readline');

// Get the current working directory
const projectRoot = process.cwd();

// Load JSON data
const specs = require(path.join(projectRoot, 'specs.json'));
const specDirectory = specs.specs[0].spec_directory;

const specPathPrefix = path.join(specDirectory, '/');

/* CONFIG */
const config = {
  definitionStringHead: '[[def:' // Start of a definition
};
/* END CONFIG */

function testing(sourceTermsFile, termFilesDir, callback) {
  console.log(`ℹ️ Only split if all conditions are met:`);

  if (!fs.existsSync('specs.json')) {
    console.log('❌ specs.json not found. Stopping.');
    return;
  }

  if (!fs.existsSync(sourceTermsFile)) {
    console.log(`❌ File not found: ${sourceTermsFile}. Stopping.`);
    return;
  }

  if (fs.existsSync(termFilesDir)) {
    console.log('ℹ️ Output directory found. Only stop if there are .md files in the directory.');
    const files = fs.readdirSync(termFilesDir);
    const mdFilesCount = files.filter(file => file.endsWith('.md')).length;
    if (mdFilesCount > 0) {
      console.log('❌ There are .md files in the directory. Stopping.');
      return;
    }
  }
  console.log(`✅ All conditions met. Splitting.`);

  callback(sourceTermsFile, termFilesDir);
}

function split(sourceTermsFile, termFilesDir) {
  if (!fs.existsSync('specs.unsplit.json')) {
    fs.copyFileSync('specs.json', 'specs.unsplit.json');
  }

  fs.copyFileSync('specs.unsplit.json', 'specs.json');

  const specs = require(path.join(projectRoot, 'specs.json'));

  if (!fs.existsSync(termFilesDir)) {
    try {
      const targetDir = path.join(process.cwd(), termFilesDir);
      fs.mkdirSync(targetDir, { recursive: true });
      console.log('✅ Directory created successfully at:', targetDir);
    } catch (error) {
      console.error('❌ Failed to create directory:', error);
    }
  }

  const arrMarkdownFileNamesAndFileOrder = specs.specs[0].markdown_paths;
  let numMarkdownFileNamesAndOrderInsertPosition = arrMarkdownFileNamesAndFileOrder.indexOf(sourceTermsFile);

  function insertGlossaryFileNameInSpecsJSON(markdownFileNamesAndFileOrder, termFileName) {
    markdownFileNamesAndFileOrder.splice(numMarkdownFileNamesAndOrderInsertPosition, 0, termFileName);
    numMarkdownFileNamesAndOrderInsertPosition++;
  }

  arrMarkdownFileNamesAndFileOrder.splice(numMarkdownFileNamesAndOrderInsertPosition, 1);

  const glossaryFileContent = fs.readFileSync(sourceTermsFile, 'utf8');
  fixContent.fixGlossaryFile(sourceTermsFile);

  const [introSection, ...sections] = glossaryFileContent.split(config.definitionStringHead);
  const introSectionFilename = 'glossary-intro-created-by-split-tool.md';
  const introDir = path.dirname(sourceTermsFile);
  const introFilePath = path.join(introDir, introSectionFilename);

  fs.writeFileSync(introFilePath, introSection);
  insertGlossaryFileNameInSpecsJSON(arrMarkdownFileNamesAndFileOrder, introFilePath);

  const termsRegex = /\[\[def: (.*?)\]\]/g;
  const matches = [...glossaryFileContent.matchAll(termsRegex)];
  const terms = matches.map(match => match[1]);

  let fileNames = terms.map(term => {
    let termWithoutComma = term.split(",")[0];
    return `${termWithoutComma.replace(/,/g, '').replace(/\//g, '-').replace(/ /g, '-').toLowerCase()}`;
  });

  sections.forEach((section, index) => {
    if (terms[index]) {
      const filename = `${fileNames[index]}.md`;
      const termFilePath = path.join(termFilesDir, filename);
      fs.writeFileSync(termFilePath, config.definitionStringHead + section);
      insertGlossaryFileNameInSpecsJSON(arrMarkdownFileNamesAndFileOrder, termFilePath);
      console.log(`✅ ${filename} created`);
    }
  });

  const specsString = JSON.stringify(specs, null, 2);
  fs.writeFileSync("specs.json", specsString);

  console.log("✅ Splitting done.");
}

// Interactive prompting and confirmation
if (process.argv[2] === "help" || process.argv[2] === "-h" || process.argv[2] === "--help") {
  const helpFilePath = path.join(__dirname, 'help.txt');
  fs.readFile(helpFilePath, 'utf8', (err, helptext) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(helptext);
  });
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`Enter the path to the terms file (default: ${specPathPrefix}terms_and_definitions.md): `, (inputFile) => {
    const pathToTermsFileToBeSplit = inputFile || `${specPathPrefix}terms_and_definitions.md`;

    rl.question(`Enter the directory to save the split files (default: ${specPathPrefix}terms-definitions): `, (outputDir) => {
      const pathToTermFilesDir = outputDir || `${specPathPrefix}terms-definitions`;

      rl.question('Are you sure you want to split files? (yes/no) ', (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          console.log('✅ Proceeding with the script...');
          testing(pathToTermsFileToBeSplit, pathToTermFilesDir, split);
        } else {
          console.log('❌ Operation canceled.');
        }
        rl.close();
      });
    });
  });
}