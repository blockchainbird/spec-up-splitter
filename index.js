#!/usr/bin/env node

/**
 * @file This file:
 *  - splits terms and definitions into separate files based on the term.
    - This is done by creating a file for each term.
    - The file name is based on the term. The content of the file is one term plus the definition of the term.
    - The file path is added to the specs.json file so it is included in the index.html after render.
    - The original glossary file is not changed, but is removed as an entry from the specs.json.
    - If not exists the specs.json file is copied to specs.unsplit.json (one time back-up of `specs.json`).
    - The `spec.json file will have multiple new entries, one entry per defined term. The file can grow large.
    - The script only works for the first entry in the “specs” array in specs.json. TODO: make it work for all specs.
 * @author Kor Dwarshuis
 * @version 1.0.0
 * @since 2024-06-10
 */

const fs = require('fs');
const path = require('path');
const fixContent = require('./fix-content.js');

// Retrieve command line arguments or set default values
const args = process.argv.slice(2);
const pathToTermsFileToBeSplit = args[0] || './spec/terms_and_definitions.md'; // Default glossary file path
const pathToTermFilesDir = args[1] || './spec/terms-definitions'; // Default output file path

/* CONFIG */
const config = {
  definitionStringHead: '[[def:' // This is the string that indicates the start of a definition and is used as a divider to split up the files
};
/* END CONFIG */


function testing(sourceTermsFile, termFilesDir, callback) {
  console.log(`Only split if all conditions are met:`);

  // Check if the specs.json file exists
  if (!fs.existsSync('specs.json')) {
    console.log('specs.json does not exist. Stopping.');
    return;
  }

  if (!fs.existsSync(sourceTermsFile)) {
    console.log(`File does not exist: ${sourceTermsFile}. Stopping.`);
    return;
  }

  if (fs.existsSync(termFilesDir)) {
    console.log('Output directory exists. Only stop if there are .md files in the directory.');
    const files = fs.readdirSync(termFilesDir);
    const mdFilesCount = files.filter(file => file.endsWith('.md')).length;
    if (mdFilesCount > 0) {
      console.log('There are .md files in the directory. Stopping.');
      return;
    }
  }
  console.log(`All conditions met. Splitting.`);

  callback();
}

function split() {
  // if “specs.unsplit.json” does not yet exist, copy “specs.json” to “specs.unsplit.json” so we have a backup
  if (!fs.existsSync('specs.unsplit.json')) {
    fs.copyFileSync('specs.json', 'specs.unsplit.json');
  }

  // Restore original
  fs.copyFileSync('specs.unsplit.json', 'specs.json');

  // Load the original specs.json file before changes
  const specs = require('./specs.json');


  // Array that holds markdown filenames in the desired order
  const arrMarkdownFileNamesAndFileOrder = specs.specs[0].markdown_paths;

  // Position in arrMarkdownFileNamesAndFileOrder where to insert new filenames
  let numMarkdownFileNamesAndOrderInsertPosition = arrMarkdownFileNamesAndFileOrder.indexOf(pathToTermsFileToBeSplit);

  /**
   * Inserts the given string into the specified array at the current insert position.
   * @param {Array} markdownFileNamesAndFileOrder - The array to insert the string into.
   * @param {string} termFileName - The string to be inserted.
   */
  function insertGlossaryFileNameInSpecsJSON(markdownFileNamesAndFileOrder, termFileName) {
    // Insert the new file name (termFileName) at the current insert position (arrMarkdownFileNamesAndOrderInsertPosition), do not remove anything (0)
    markdownFileNamesAndFileOrder.splice(numMarkdownFileNamesAndOrderInsertPosition, 0, termFileName);

    // The next file should be added one position further:
    numMarkdownFileNamesAndOrderInsertPosition++;
  }

  // The original filename that points to the file that holds all terms and definitions, and that is going to be split up, is removed from the array that holds the filenames in the desired order
  arrMarkdownFileNamesAndFileOrder.splice(numMarkdownFileNamesAndOrderInsertPosition, 1);


  const glossaryFileContent = fs.readFileSync(pathToTermsFileToBeSplit, 'utf8');

  // Perform a few basic fixes on the source file
  fixContent.fixGlossaryFile(pathToTermsFileToBeSplit);


  // Remove directory with the splitted files if it exists
  if (fs.existsSync(pathToTermFilesDir)) {
    fs.rmdirSync(pathToTermFilesDir, { recursive: true });
  }

  // Create directory that is going to hold splitted files if it doesn't exist
  if (!fs.existsSync(pathToTermFilesDir)) {
    fs.mkdirSync(pathToTermFilesDir, { recursive: true });
  }

  // Find the terms by looking at the predictable string that indicates the start of a definition
  const termsRegex = /\[\[def: (.*?)\]\]/g;

  // Create array with the terms and also meta information about the terms
  const matches = [...glossaryFileContent.matchAll(termsRegex)];

  // Extract terms. We don't need the meta info, we only need the term, the second element of the match array
  const terms = matches.map(match => match[1]);

  // Create filenames from terms
  let fileNames = terms.map(term => {
    // if there are comma's take the part before the first comma
    let termWithoutComma = term.split(",")[0];

    return `${termWithoutComma.replace(/,/g, '').replace(/\//g, '-').replace(/ /g, '-').toLowerCase()}`;
  });

  // Add the filename for the glossary introduction
  insertGlossaryFileNameInSpecsJSON(arrMarkdownFileNamesAndFileOrder, "glossaryIntro.md");

  const sections = glossaryFileContent.split(config.definitionStringHead).slice(1); // slice(1) to remove the first part before the first heading

  sections.forEach((section, index) => {
    let filename = '';
    if (terms[index]) {
      filename = `${fileNames[index]}.md`;
      console.log('filename: ', filename);

      // Write separate files to disk
      fs.writeFileSync(
        // Where to write to:
        path.join(pathToTermFilesDir, "/", filename),
        // What to write:
        config.definitionStringHead + section
      );

      // Add file path to specs
      insertGlossaryFileNameInSpecsJSON(arrMarkdownFileNamesAndFileOrder, path.join(pathToTermFilesDir, '/', filename));
    }
  });

  // make string from specs for writing to file
  const specsString = JSON.stringify(specs);
  fs.writeFileSync("./specs.json", specsString);

}

testing(pathToTermsFileToBeSplit, pathToTermFilesDir, split);