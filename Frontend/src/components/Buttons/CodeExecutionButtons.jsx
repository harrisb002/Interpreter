import React from "react";
import { Button } from "@chakra-ui/react";

/**
 * CodeExecutionButtons
 * - Single main button: 'Run Code' or 'Run Test'
 * - Additional 'tokens', 'cst', 'ast', 'symbolTable' if language='blue'
 * - NO spinner logic here (handled by Sandbox with delayed display)
 */
const CodeExecutionButtons = ({
  isLoading,
  onExecuteType,
  language,
  selectedTest,
  isTestUnmodified,
}) => {
  let runLabel = "Run Code";
  // If language='blue' & test selected & unmodified => 'Run Test'
  if (language === "blue" && selectedTest && isTestUnmodified) {
    runLabel = "Run Test";
  }

  return (
    <>
      {/* Main button => calls onExecuteType('run') */}
      <Button
        variant="outline"
        colorScheme="green"
        mb={4}
        isLoading={false} // do NOT show spinner based on isLoading
        onClick={() => onExecuteType("run")}
      >
        {runLabel}
      </Button>

      {language === "blue" && (
        <>
          <Button
            variant="outline"
            colorScheme="green"
            mb={4}
            ml={2}
            isDisabled={isLoading}
            onClick={() => onExecuteType("tokens")}
          >
            Tokens
          </Button>
          <Button
            variant="outline"
            colorScheme="green"
            mb={4}
            ml={2}
            isDisabled={isLoading}
            onClick={() => onExecuteType("cst")}
          >
            CST
          </Button>
          <Button
            variant="outline"
            colorScheme="green"
            mb={4}
            ml={2}
            isDisabled={isLoading}
            onClick={() => onExecuteType("ast")}
          >
            AST
          </Button>
          <Button
            variant="outline"
            colorScheme="green"
            mb={4}
            ml={2}
            isDisabled={isLoading}
            onClick={() => onExecuteType("symbolTable")}
          >
            SymbolTable
          </Button>
        </>
      )}
    </>
  );
};

export default CodeExecutionButtons;
