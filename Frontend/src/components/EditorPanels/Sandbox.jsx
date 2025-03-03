import React, { useRef, useState, useEffect } from "react";
import { Box, HStack, Spinner, Text } from "@chakra-ui/react";
import Editor from "@monaco-editor/react";
import { CODE_SNIPPETS } from "../../Constants/languages";
import { executeCode } from "../../api"; // For non-blue languages
import LanguageSelector from "../Buttons/LanguageSelector";
import TestSelector from "../Buttons/TestSelector";
import CodeExecutionButtons from "../Buttons/CodeExecutionButtons";
import Output from "./Output";

const Sandbox = () => {
  const editorRef = useRef(null);

  // Language defaults to 'blue'
  const [language, setLanguage] = useState("blue");
  const [code, setCode] = useState(CODE_SNIPPETS.blue || "");

  const [tests, setTests] = useState({});
  const [selectedTest, setSelectedTest] = useState(null);
  const [originalTestCode, setOriginalTestCode] = useState("");
  const [isTestUnmodified, setIsTestUnmodified] = useState(false);

  // Output data
  const [output, setOutput] = useState([]);
  const [isError, setIsError] = useState(false);

  // Loading & spinner states
  const [isLoading, setIsLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  /**
   * Fetch tests on mount from https://interpreter-5za8-api.onrender.com
   */
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await fetch("https://interpreter-5za8-api.onrender.com/api/tests");

        // If server responded with an error code or HTML, log for debugging
        if (!res.ok) {
          const text = await res.text();
          console.error("Failed to fetch tests. Status:", res.status, "Body:", text);
          return;
        }

        // Attempt parse JSON
        const data = await res.json();
        setTests(data);
      } catch (err) {
        console.error("Error fetching tests:", err);
      }
    };
    fetchTests();
  }, []);

  // If language changes => reset snippet & test states
  useEffect(() => {
    setCode(CODE_SNIPPETS[language] || "");
    setSelectedTest(null);
    setOriginalTestCode("");
    setIsTestUnmodified(false);
    setOutput([]);
    setIsError(false);
  }, [language]);

  // Delayed spinner => show after 3s if loading
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShowSpinner(true), 3000);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Monaco Editor mount
  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  // If code changes, check if it matches the test code
  const handleCodeChange = (val) => {
    setCode(val);
    setIsTestUnmodified(selectedTest && val === originalTestCode);
  };

  // User selects a test from the dropdown
  const handleTestSelect = (testName, testCode) => {
    setSelectedTest(testName);
    setCode(testCode);
    setOriginalTestCode(testCode);
    setIsTestUnmodified(true);
    setOutput([]);
    setIsError(false);
  };

  // If language='blue', highlight csharp in the editor
  const getMonacoLanguage = () => (language === "blue" ? "csharp" : language);

  /**
   * runSingleTest => calls https://interpreter-5za8-api.onrender.com for 'blue'
   */
  const runSingleTest = async (sourceCode, type) => {
    let lines = [];
    let errorFlag = false;

    if (language === "blue") {
      // Post to your Node server
      const res = await fetch(`https://interpreter-5za8-api.onrender.com/execute-blue-code/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode }),
      });

      const json = await res.json();
      if (json.isError) {
        errorFlag = true;
        lines = json.stderr ? json.stderr.split("\n") : [];
      } else {
        lines = json.output ? json.output.split("\n") : [];
      }
    } else {
      // If non-blue => use Piston
      const pistonRes = await executeCode(language, sourceCode);
      if (pistonRes.run.stderr) {
        errorFlag = true;
        lines = pistonRes.run.stderr.split("\n");
      } else {
        lines = pistonRes.run.output.split("\n");
      }
    }

    return { lines, errorFlag };
  };

  // Compare lines ignoring trailing spaces
  const compareTrimmedLines = (actual, expected) => {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      const a = actual[i].trimEnd();
      const e = expected[i].trimEnd();
      if (a !== e) return false;
    }
    return true;
  };

  // Return lines for the selected test
  const getExpectedLines = (testKey) => {
    for (const groupName of Object.keys(tests)) {
      if (tests[groupName][testKey]) {
        return tests[groupName][testKey].output.split("\n");
      }
    }
    return [];
  };

  /**
   * onExecuteType => run single test or tokens/cst/etc.
   */
  const onExecuteType = async (type) => {
    const currentCode = editorRef.current?.getValue() || "";
    if (!currentCode) return;

    setIsLoading(true);
    try {
      const { lines, errorFlag } = await runSingleTest(currentCode, type);
      setIsError(errorFlag);

      // If it's a test run & code matches selected test => compare
      if (type === "run" && language === "blue" && selectedTest && isTestUnmodified) {
        const expected = getExpectedLines(selectedTest);
        const pass = !errorFlag && compareTrimmedLines(lines, expected);

        if (pass) {
          setOutput(["✅ Test Passed", ...lines]);
          setIsError(false);
        } else {
          setIsError(true);
          setOutput(["❌ Test Failed", "Expected:", ...expected, "Got:", ...lines]);
        }
      } else {
        // normal run (no test compare)
        setOutput(lines);
      }
    } catch (err) {
      setIsError(true);
      setOutput([err.message || "Unable to run code"]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * runAllTestsIncremental => runs all subtests if language='blue'
   */
  const runAllTestsIncremental = async () => {
    if (language !== "blue") return;
    setIsLoading(true);
    setOutput([]);
    setIsError(false);

    try {
      let passCount = 0;
      let failCount = 0;

      // Gather subtests
      const allSubtests = [];
      for (const groupName of Object.keys(tests)) {
        for (const subTestKey of Object.keys(tests[groupName])) {
          allSubtests.push({ subTestKey, testData: tests[groupName][subTestKey] });
        }
      }

      for (const { subTestKey, testData } of allSubtests) {
        const { lines, errorFlag } = await runSingleTest(testData.input, "run");
        const expected = getExpectedLines(subTestKey);
        const pass = !errorFlag && compareTrimmedLines(lines, expected);

        let resultLine;
        if (pass) {
          passCount++;
          resultLine = `✅ ${subTestKey} => PASSED`;
        } else {
          failCount++;
          resultLine = [
            `❌ ${subTestKey} => FAILED`,
            `Expected => ${expected.join(" | ")}`,
            `Got => ${lines.join(" | ")}`
          ].join("\n");
        }
        setOutput((prev) => [...prev, resultLine]);
      }

      // Final summary
      const total = passCount + failCount;
      setOutput((prev) => [...prev, `=== Summary: ${passCount} passed | ${failCount} failed | ${total} total ===`]);
      setIsError(failCount > 0);

    } catch (error) {
      setIsError(true);
      setOutput([error.message || "Unable to run all tests"]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <HStack spacing={4}>
        {/* LEFT Panel: Editor + Tests */}
        <Box w="50%">
          <LanguageSelector language={language} onSelect={setLanguage} />
          <TestSelector
            selectedTest={selectedTest}
            onSelect={handleTestSelect}
            tests={tests}
            setCode={setCode}
            language={language}
            onRunAllTests={runAllTestsIncremental}
          />
          <Editor
            options={{ minimap: { enabled: false } }}
            height="90vh"
            theme="vs-dark"
            language={getMonacoLanguage()}
            value={code}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.focus();
            }}
            onChange={handleCodeChange}
          />
        </Box>

        {/* RIGHT Panel: Execution + Output */}
        <Box w="50%">
          {showSpinner && (
            <Text fontSize="sm" color="yellow.200" mb={2}>
              <Spinner size="sm" mr={2} />
              Apologies, my server may be spinning up...
            </Text>
          )}

          <CodeExecutionButtons
            isLoading={isLoading}
            onExecuteType={onExecuteType}
            language={language}
            selectedTest={selectedTest}
            isTestUnmodified={isTestUnmodified}
          />
          <Output output={output} isError={isError} />
        </Box>
      </HStack>
    </Box>
  );
};

export default Sandbox;
