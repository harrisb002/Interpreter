import React, { useRef, useState, useEffect } from "react";
import { Box, HStack, Spinner, Text } from "@chakra-ui/react";
import Editor from "@monaco-editor/react";

import { CODE_SNIPPETS } from "../../Constants/languages";
import { executeCode } from "../../api"; // For non-blue languages
import LanguageSelector from "../Buttons/LanguageSelector";
import TestSelector from "../Buttons/TestSelector";
import CodeExecutionButtons from "../Buttons/CodeExecutionButtons";
import Output from "./Output";

/**
 * Sandbox
 * - Language defaults to 'blue'
 * - Single test or 'Run All Tests' for 'blue' only
 * - Continues even if subtests error (thanks to 200 + isError in backend)
 * - Delayed spinner only after 3s
 */
const Sandbox = () => {
  const editorRef = useRef(null);

  // Language & code
  const [language, setLanguage] = useState("blue");
  const [code, setCode] = useState(CODE_SNIPPETS.blue || "");

  // Tests
  const [tests, setTests] = useState({});
  const [selectedTest, setSelectedTest] = useState(null);
  const [originalTestCode, setOriginalTestCode] = useState("");
  const [isTestUnmodified, setIsTestUnmodified] = useState(false);

  // Execution states
  const [output, setOutput] = useState([]);
  const [isError, setIsError] = useState(false);

  // Spinner
  const [isLoading, setIsLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  /**
   * Fetch tests from backend on mount
   */
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await fetch("https://interpreter-5za8.onrender.com/api/tests");
        const data = await res.json();
        setTests(data);
      } catch (err) {
        console.error("Error fetching tests:", err);
      }
    };
    fetchTests();
  }, []);
  
  /**
   * If language changes => reset snippet & states
   */
  useEffect(() => {
    setCode(CODE_SNIPPETS[language] || "");
    setSelectedTest(null);
    setOriginalTestCode("");
    setIsTestUnmodified(false);
    setOutput([]);
    setIsError(false);
  }, [language]);

  /**
   * Delayed spinner => show after 3s if still loading
   */
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShowSpinner(true), 3000);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  /**
   * Editor mount
   */
  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  /**
   * Code changes => check if code still matches the test
   */
  const handleCodeChange = (val) => {
    setCode(val);
    setIsTestUnmodified(selectedTest && val === originalTestCode);
  };

  /**
   * Single test selection
   */
  const handleTestSelect = (testName, testCode) => {
    setSelectedTest(testName);
    setCode(testCode);
    setOriginalTestCode(testCode);
    setIsTestUnmodified(true);
    setOutput([]);
    setIsError(false);
  };

  /**
   * 'blue' => 'csharp' for Monaco editor
   */
  const getMonacoLanguage = () => (language === "blue" ? "csharp" : language);

  /**
   * If the backend sets isError, or if it's Piston with stderr => errorFlag
   */
  const runSingleTest = async (sourceCode, type) => {
    let lines = [];
    let errorFlag = false;

    if (language === "blue") {
      // call the local /execute-blue-code
      const res = await fetch(`https://interpreter-5za8.onrender.com/execute-blue-code/${type}`, {
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
      // Non-blue => Piston
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

  /**
   * Compare lines ignoring trailing whitespace
   */
  const compareTrimmedLines = (actual, expected) => {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      const a = actual[i].trimEnd();
      const e = expected[i].trimEnd();
      if (a !== e) return false;
    }
    return true;
  };

  /**
   * get lines of expected output for a subTest
   */
  const getExpectedLines = (testKey) => {
    for (const groupName of Object.keys(tests)) {
      if (tests[groupName][testKey]) {
        return tests[groupName][testKey].output.split("\n");
      }
    }
    return [];
  };

  /**
   * onExecuteType => run single test or tokens/AST...
   */
  const onExecuteType = async (type) => {
    const currentCode = editorRef.current?.getValue() || "";
    if (!currentCode) return;

    setIsLoading(true);
    try {
      const { lines, errorFlag } = await runSingleTest(currentCode, type);
      setIsError(errorFlag);

      // If 'run' + 'blue' + test unmodified => compare
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
        // normal run
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
   * runAllTestsIncremental => run every subtest in sequence
   */
  const runAllTestsIncremental = async () => {
    if (language !== "blue") return; // only for 'blue'
    setIsLoading(true);
    setOutput([]);
    setIsError(false);

    try {
      let passCount = 0;
      let failCount = 0;

      // gather all subtests
      const allSubtests = [];
      for (const groupName of Object.keys(tests)) {
        for (const subTestKey of Object.keys(tests[groupName])) {
          allSubtests.push({ subTestKey, testData: tests[groupName][subTestKey] });
        }
      }

      for (const { subTestKey, testData } of allSubtests) {
        const { lines, errorFlag } = await runSingleTest(testData.input, "run");

        // check if lines match the expected lines ignoring trailing whitespace
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

      // summary
      const total = passCount + failCount;
      setOutput((prev) => [
        ...prev,
        `=== Summary: ${passCount} passed | ${failCount} failed | ${total} total ===`
      ]);
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
