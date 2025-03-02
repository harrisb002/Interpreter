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

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:10000", "http://localhost:5173", "https://interpreter-5za8.onrender.com"],
  })
);

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
        // 200 with an error flag
        return res.json({
          isError: true,
          output: "",
          stderr: `Command failed: ${error.message}\n${stderr}`,
        });
      }

      // If no error, return normal data
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

/** Return all tests */
app.get("/api/tests", (req, res) => {
  const tests = collectTests();
  res.json(tests);
});

app.listen(port, "0.0.0.0", () =>
  console.log(`Server running on port ${port}`.cyan)
);
