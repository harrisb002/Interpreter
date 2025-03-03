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
    origin: [
      "https://interpreter-5za8-api.onrender.com",
    ],
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
        return res.json({
          isError: true,
          output: "",
          stderr: `Command failed: ${error.message}\n${stderr}`,
        });
      }

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

app.get("/api/tests", (req, res) => {
  try {
    const tests = collectTests();
    res.json(tests);
  } catch (err) {
    res.json({ isError: true, stderr: `Failed to load tests: ${err.message}` });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`.cyan);
});
