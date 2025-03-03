/******************************************************************************
 * server.js
 * Node/Express server for handling test retrieval & Blue code execution
 ******************************************************************************/
const express = require("express");
const cors = require("cors");
const colors = require("colors");
const fs = require("fs").promises;
const { exec } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");
const collectTests = require("./collectTests"); // your local function

dotenv.config();

const app = express();
// Render typically sets PORT for you. 
// If your environment uses BLUE_PORT, fallback to 10000
const port = process.env.PORT || process.env.BLUE_PORT || 10000;

// Parse JSON bodies
app.use(express.json());

// CORS to allow requests from your front-end domain
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://interpreter-5za8.onrender.com", 
      // If your front-end is also at some-other-domain, add it here
    ],
  })
);

/**
 * POST /execute-blue-code/:type
 * e.g. /execute-blue-code/run, /execute-blue-code/tokens, etc.
 * Writes code to a temp file and runs ./main with the file + type
 */
app.post("/execute-blue-code/:type", async (req, res) => {
  const { sourceCode } = req.body;
  const { type } = req.params;

  const filePath = path.join(__dirname, "tempSourceCode.c");
  const command = `./main ${filePath} ${type}`;

  try {
    await fs.writeFile(filePath, sourceCode);
    console.log("Source code written to file:", filePath);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        // Return JSON with isError for your front-end
        return res.json({
          isError: true,
          output: "",
          stderr: `Command failed: ${error.message}\n${stderr}`,
        });
      }

      // No error
      return res.json({
        isError: false,
        output: stdout,
        stderr: stderr,
      });
    });
  } catch (error) {
    // If writing file fails
    res.json({
      isError: true,
      output: "",
      stderr: `Server error: ${error.message}`,
    });
  }
});

/**
 * GET /api/tests
 * Return all tests in JSON (via your collectTests() function)
 */
app.get("/api/tests", (req, res) => {
  try {
    const tests = collectTests();
    res.json(tests);
  } catch (err) {
    res.json({
      isError: true,
      stderr: `Failed to load tests: ${err.message}`,
    });
  }
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`.cyan);
});
