import React from "react";
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuGroup,
  MenuList,
  Text,
} from "@chakra-ui/react";

const TestSelector = ({
  selectedTest,
  onSelect,
  tests,
  setCode,
  language,
  onRunAllTests, // IMPORTANT: pass the run-all callback down
}) => {
  const menuDisabled = language !== "blue";
  const groupEntries = Object.entries(tests);

  return (
    <Box ml={2} mb={4}>
      <Text mb={2} fontSize="lg">
        Choose a Test:
      </Text>
      <Menu>
        {/* Single test dropdown */}
        <MenuButton as={Button} isDisabled={menuDisabled} mr={2}>
          {menuDisabled
            ? "Tests Disabled (not blue)"
            : selectedTest || "No Current Test Selected"}
        </MenuButton>

        {/* The 'Run All Tests' button next to the dropdown */}
        {language === "blue" && (
          <Button
            variant="outline"
            colorScheme="blue"
            mr={2}
            onClick={onRunAllTests} // calls the parent callback
          >
            Run All Tests
          </Button>
        )}

        <MenuList bg="#110c1b">
          {menuDisabled ? (
            <MenuItem disabled>Switch language to 'blue' to select tests</MenuItem>
          ) : groupEntries.length > 0 ? (
            groupEntries.map(([groupName, subTests]) => (
              <MenuGroup key={groupName} title={groupName}>
                {Object.keys(subTests).map((subTestKey) => {
                  const testObj = subTests[subTestKey];
                  return (
                    <MenuItem
                      key={subTestKey}
                      color={subTestKey === selectedTest ? "blue.400" : ""}
                      bg={subTestKey === selectedTest ? "gray.900" : "transparent"}
                      _hover={{ color: "blue.400", bg: "gray.900" }}
                      onClick={() => onSelect(subTestKey, testObj.input)}
                    >
                      {subTestKey}
                    </MenuItem>
                  );
                })}
              </MenuGroup>
            ))
          ) : (
            <MenuItem disabled>No Tests Available</MenuItem>
          )}
        </MenuList>
      </Menu>
    </Box>
  );
};

export default TestSelector;
