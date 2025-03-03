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
const port = process.env.BLUE_PORT || 10000;

// Parse JSON bodies
app.use(express.json());

// Allow requests from your deployed site
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://interpreter-5za8.onrender.com",
    ],
  })
);

/**
 * POST /execute-blue-code/:type
 * Runs the Blue interpreter with the code in 'tempSourceCode.c'
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
        return res.json({
          isError: true,
          output: "",
          stderr: `Command failed: ${error.message}\n${stderr}`,
        });
      }

      // If success
      return res.json({
        isError: false,
        output: stdout,
        stderr: stderr,
      });
    });
  } catch (error) {
    res.json({
      isError: true,
      output: "",
      stderr: `Server error: ${error.message}`,
    });
  }
});

/**
 * GET /api/tests
 * Return all tests as JSON
 */
app.get("/api/tests", (req, res) => {
  try {
    const tests = collectTests();
    res.json(tests); // Must be valid JSON
  } catch (err) {
    res.json({ isError: true, stderr: `Failed to load tests: ${err.message}` });
  }
});

// Start the server – Render will override the port env var if needed
app.listen(port, "0.0.0.0", () =>
  console.log(`Server running on port ${port}`.cyan)
);
