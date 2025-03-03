const express = require("express");
const cors = require("cors");
const colors = require("colors");
const fs = require("fs").promises;
const { exec } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");
const collectTests = require("./collectTests");

dotenv.config();

const app = express();
// Use PORT from environment or fallback to 10000
const port = process.env.PORT || process.env.BLUE_PORT || 10000;

// Parse JSON bodies
app.use(express.json());

// CORS config to allow requests from your front-end domain(s)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://interpreter-5za8.onrender.com",
      // If you have other front-end domains, list them here
    ],
  })
);

/**
 * POST /execute-blue-code/:type
 * - Writes source code to tempSourceCode.c
 * - Runs ./main with the file + type
 */
app.post("/execute-blue-code/:type", async (req, res) => {
  const { sourceCode } = req.body;
  const { type } = req.params;

  const filePath = path.join(__dirname, "tempSourceCode.c");
  const command = `./main ${filePath} ${type}`;

  try {
    // Write the code to tempSourceCode.c
    await fs.writeFile(filePath, sourceCode);
    console.log("Source code written to file:", filePath);

    // Exec your custom Blue interpreter
    exec(command, (error, stdout, stderr) => {
      if (error) {
        // Return JSON with isError if there's an error
        return res.json({
          isError: true,
          output: "",
          stderr: `Command failed: ${error.message}\n${stderr}`,
        });
      }
      // Return success if no error
      return res.json({
        isError: false,
        output: stdout,
        stderr: stderr,
      });
    });
  } catch (error) {
    // If writing file fails or other internal error
    res.json({
      isError: true,
      output: "",
      stderr: `Server error: ${error.message}`,
    });
  }
});

/**
 * GET /api/tests
 * Returns all tests from collectTests() as JSON
 */
app.get("/api/tests", (req, res) => {
  try {
    const tests = collectTests();
    // Must be valid JSON or front-end parse fails
    res.json(tests);
  } catch (err) {
    res.json({
      isError: true,
      stderr: `Failed to load tests: ${err.message}`,
    });
  }
});

// Start listening on the correct port
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`.cyan);
});
