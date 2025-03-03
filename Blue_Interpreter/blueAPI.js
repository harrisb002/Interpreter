const express = require("express");
const cors = require("cors");
const colors = require("colors");
const fs = require("fs").promises;
const { exec } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");
const collectTests = require("./collectTests"); // your function that reads tests from /Testing

dotenv.config();
const app = express();

// Use environment variable or default
const port = process.env.BLUE_PORT || 10000;

// Parse incoming JSON
app.use(express.json());

// Allow requests from your React site domain + local dev
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://interpreter-5za8.onrender.com", // front-end domain
    ],
  })
);

/**
 * POST /execute-blue-code/:type
 * e.g. /execute-blue-code/run
 * Writes source code to tempSourceCode.c, then executes `./main tempSourceCode.c run`
 */
app.post("/execute-blue-code/:type", async (req, res) => {
  const { sourceCode } = req.body;
  const { type } = req.params;

  const filePath = path.join(__dirname, "tempSourceCode.c");
  const command = `./main ${filePath} ${type}`;

  try {
    // Write the code to a temp file
    await fs.writeFile(filePath, sourceCode);
    console.log("Source code written to file:", filePath);

    // Execute your custom 'main' interpreter
    exec(command, (error, stdout, stderr) => {
      if (error) {
        // Return JSON with isError=true
        return res.json({
          isError: true,
          output: "",
          stderr: `Command failed: ${error.message}\n${stderr}`,
        });
      }

      // Success => Return JSON with isError=false
      return res.json({
        isError: false,
        output: stdout,
        stderr: stderr,
      });
    });
  } catch (error) {
    // If writing file fails or other server error
    res.json({
      isError: true,
      output: "",
      stderr: `Server error: ${error.message}`,
    });
  }
});

/**
 * GET /api/tests
 * Returns all tests in JSON (via collectTests())
 */
app.get("/api/tests", (req, res) => {
  try {
    const tests = collectTests();
    // Must be valid JSON, or front-end parse fails
    res.json(tests);
  } catch (err) {
    // If something goes wrong reading the tests
    res.json({ isError: true, stderr: `Failed to load tests: ${err.message}` });
  }
});

// Start listening on Render's assigned port or fallback port
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`.cyan);
});
