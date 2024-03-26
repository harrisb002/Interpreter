#ifndef PARSER_H
#define PARSER_H

#include "../Token/Token.h"
#include "Node.h" // Defines the concrete syntax tree
#include <vector>

class Parser {
    std::vector<Token> tokens;
    size_t current = 0;
    NodePtr root; // Root of the CST
    NodePtr lastNode;

    enum InsertionMode {
        LeftChild,
        RightSibling
    };

public:
    // Constructor (Using explicit to avoid accidental implicit conversions)
    explicit Parser(const std::vector<Token>& tokens);

    NodePtr parse(); 

private:
    Token getToken(); // Gets the current token and moves to the next
    bool match(Token::Type type, Token t); // Checks if the current token matches the given token type
    void addToCST(NodePtr node, InsertionMode mode);
    NodePtr createNodePtr(const Token& token);

    Token peekToken() const;
    NodePtr expectToken(Token::Type expectedType, const std::string &errorMessage);


    void parseProcedure();
    void parseParameterList();

    void parseFunction();

    void parseDeclaration();
    void parseIDENTIFIER_AND_IDENTIFIER_ARRAY_LIST();
    void parseIDENTIFIER_ARRAY_LIST();
    void parseIDENTIFIER_LIST();

    void parseBlockStatement();
    void parseCompoundStatement();
    void parseStatement();
    void parseAssignmentStatement();    // not done
    void parseIterationStatement();     // not done
    void parsePrintfStatement();        // not done
    void parseReturnStatement();        
    void parseSelectionStatement();     // For IF statements

 
    void parseExpression();

    void parseNumericalExpression();
    void parseNumericalOperand();

    void parseBooleanExpression();
    bool isBooleanOperator(Token::Type type);
    bool isBooleanValue(const std::string& value);
    bool isNumericalOperator(Token::Type type);
    bool isComparisonOperator(Token::Type type);

};

bool isDataType(std::string id);
bool isReserved(std::string id);

#endif // PARSER_H
