import React from "react";
import { Box, Text } from "@chakra-ui/react";

const Output = ({ output, isError }) => {
  return (
    <Box>
      <Text mb={2} fontSize="lg">
        Output
      </Text>
      <Box
        height="90vh"
        color={isError ? "red.400" : "white"}
        border="1px solid"
        borderColor={isError ? "red.500" : "#333"}
        overflowY="auto"
      >
        {output && output.length > 0 ? (
          output.map((line, i) => (
            <Text key={i} color="white">
              {line}
            </Text>
          ))
        ) : (
          <Text color="white">Click "Run Code" to see the output here</Text>
        )}
      </Box>
    </Box>
  );
};

export default Output;
