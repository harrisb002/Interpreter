const fs = require("fs");
const path = require("path");

const mainTestDir = path.join(__dirname, "../Testing");

function parseFolderName(folder) {
  return folder.replace("_", " ");
}

function normalizeLines(content) {
  return content
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n");
}

function collectTests() {
  const groupedTests = {};
  try {
    const testFolders = fs.readdirSync(mainTestDir);

    testFolders.forEach((folder) => {
      const testPath = path.join(mainTestDir, folder);
      if (fs.statSync(testPath).isDirectory() && folder.startsWith("Test_")) {
        const inputPath = path.join(testPath, "Input");
        const outputPath = path.join(testPath, "Output");
        
        if (fs.existsSync(inputPath) && fs.existsSync(outputPath)) {
          const inputFiles = fs.readdirSync(inputPath);
          const outputFiles = fs.readdirSync(outputPath);

          const groupName = parseFolderName(folder);
          if (!groupedTests[groupName]) {
            groupedTests[groupName] = {};
          }

          inputFiles.forEach((inputFile, i) => {
            const subTestName = `${groupName}.${i + 1}`;
            // Normalize input
            const inputRaw = fs.readFileSync(path.join(inputPath, inputFile), "utf8");
            const inputContent = normalizeLines(inputRaw);

            let outputContent = "";
            if (outputFiles[i]) {
              const outputRaw = fs.readFileSync(
                path.join(outputPath, outputFiles[i]),
                "utf8"
              );
              outputContent = normalizeLines(outputRaw);
            }

            groupedTests[groupName][subTestName] = {
              input: inputContent,
              output: outputContent,
            };
          });
        }
      }
    });
  } catch (err) {
    console.error("Error reading test directories:", err);
  }
  return groupedTests;
}

module.exports = collectTests;
