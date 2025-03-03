import React from "react";
import { Button } from "@chakra-ui/react";

const CodeExecutionButtons = ({
  isLoading,
  onExecuteType,
  language,
  selectedTest,
  isTestUnmodified,
}) => {
  let runLabel = "Run Code";
  if (language === "blue" && selectedTest && isTestUnmodified) {
    runLabel = "Run Test";
  }

  return (
    <>
      <Button
        variant="outline"
        colorScheme="green"
        mb={4}
        isLoading={false}
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
