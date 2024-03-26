#include "Parser.h"
#include <iostream>
using namespace std;
// Use make_shared to dynamically allocate Node instances.
// When a new node is created, it's managed by a shared_ptr.

Parser::Parser(const std::vector<Token> &tokens) : tokens(tokens) {}

NodePtr Parser::parse() {

    while (current < tokens.size()) {

        Token t = getToken();

        if (t.type() == Token::Type::Identifier) {
            string tokenValue = t.value();
            cout << tokenValue << endl;
            if (isDataType(tokenValue)) {
                parseDeclaration();
            } else if (tokenValue == "procedure") {
                parseProcedure();
            } else if (tokenValue == "function") {
                parseFunction();
            } else { // error, global scope can only contain global variable
                     // declarations, procedures, and functions
                cerr << "Invalid syntax in global scope at line " << t.lineNum()
                     << endl;
                exit(1);
            }
        }
    }

    return root;
}

Token Parser::getToken() {
    if (current < tokens.size()) {
        return tokens[current++]; // Corrected to avoid returning a reference
    } else {
        throw std::runtime_error("Unexpected end of input");
    }
}

void Parser::addToCST(NodePtr node, InsertionMode mode) {
    if (!root) {
        root = node;
    } else {
        if (mode == LeftChild)
            lastNode->leftChild = node;
        else
            lastNode->rightSibling = node;
    }
    lastNode = node;
}

NodePtr Parser::createNodePtr(const Token &token) {
    // Create a Node object with the provided Token
    NodePtr nodePtr = std::make_shared<Node>(token);
    return nodePtr;
}

bool Parser::match(Token::Type type, Token t) {
    if (t.type() == type) {
        return true;
    }
    return false;
}

void Parser::parseDeclaration() {

    Token currToken = tokens[current];

    if (match(Token::Type::Identifier, currToken) &&
        isDataType(currToken.value())) {
        addToCST(createNodePtr(currToken),
                 LeftChild); // add data type id to CST

        parseIDENTIFIER_AND_IDENTIFIER_ARRAY_LIST(); // add list of identifiers

        // semicolon check and add
        currToken = getToken();
        if (!match(Token::Type::Semicolon, currToken)) { // ERROR reserved name
            cerr << "Syntax error on line " << currToken.lineNum()
                 << ": missing ';'" << endl;
            exit(1);
        }
        addToCST(createNodePtr(currToken), RightSibling); // add name id to CST
    }
}

void Parser::parseIDENTIFIER_AND_IDENTIFIER_ARRAY_LIST() {

    while (!match(Token::Type::Semicolon, tokens[current])) {
        parseIDENTIFIER_ARRAY_LIST();
        parseIDENTIFIER_LIST();
    }
}

void Parser::parseIDENTIFIER_ARRAY_LIST() {
    Token currToken = getToken();
    Token nextToken = getToken();
    bool foundEnd = false;

    while (match(Token::Type::Identifier, currToken) && !foundEnd) {
        if (isReserved(currToken.value())) { // check reserved
            cerr << "Syntax error on line " << currToken.lineNum()
                 << ": reserved word \"" << currToken.value()
                 << "\" cannot be used for a variable name." << endl;
            exit(1);
        }

        if (match(Token::Type::LBracket, nextToken)) {
            addToCST(createNodePtr((currToken)),
                     RightSibling); // add array name
            addToCST(createNodePtr((nextToken)),
                     RightSibling); // add left bracket

            Token num = getToken();
            if (isReserved(num.value())) { // check reserved
                cerr << "Syntax error on line " << num.lineNum()
                     << ": reserved word \"" << num.value()
                     << "\" cannot be used for a variable name." << endl;
                exit(1);
            }
            if (stoi(num.value()) <= 0 &&
                !match(Token::Type::Identifier,
                       num)) { // ERROR negative array size
                cerr << "Syntax error on line " << num.lineNum()
                     << ": array declaration size must be a positive integer."
                     << endl;
                exit(1);
            }
            addToCST(createNodePtr((num)),
                     RightSibling); // add num/variable name

            nextToken = getToken(); // get right bracket
            if (!match(Token::Type::RBracket,
                       nextToken)) { // ERROR negative array size
                cerr << "Syntax error on line " << nextToken.lineNum()
                     << ": Incomplete bracket." << endl;
                exit(1);
            }
            addToCST(createNodePtr((nextToken)),
                     RightSibling); // add right bracket

            nextToken = getToken();
            if (match(Token::Type::Comma, nextToken)) {
                addToCST(createNodePtr((nextToken)), RightSibling); // add comma
                currToken = getToken();
                nextToken = getToken();
            } else {
                foundEnd = true;
                current--;
            }
        } else
            current -= 2;
    }
}

void Parser::parseIDENTIFIER_LIST() {
    Token currToken = getToken();
    Token nextToken = getToken();

    bool foundEnd = false;

    while (match(Token::Type::Identifier, currToken) && !foundEnd) {
        if (isReserved(currToken.value())) {
            cerr << "Syntax error on line " << currToken.lineNum()
                 << ": reserved word \"" << currToken.value()
                 << "\" cannot be used for a variable name." << endl;
            exit(1);
        }

        // next token not bracket
        if (!match(Token::Type::LBracket, nextToken)) {
            addToCST(createNodePtr((currToken)),
                     RightSibling); // add variable name
            if (match(Token::Type::Comma, nextToken)) {
                addToCST(createNodePtr((nextToken)), RightSibling); // add comma
                currToken = getToken();
                nextToken = getToken();
            } else {
                foundEnd = true;
                current--;
            }
        } else
            current -= 2;
    }
}

void Parser::parseExpression() {
    Token nextToken = peekToken();
    if (isBooleanOperator(nextToken.type()) ||
        isBooleanValue(nextToken.value())) {
        parseBooleanExpression();
    } else {
        parseNumericalExpression();
    }
}

void Parser::parseSelectionStatement() {
    // Used for parsing selection statements (if-else)
}

void Parser::parseNumericalExpression() {
    Token currToken = peekToken();
    if (match(Token::Type::LParen, currToken)) {
        getToken(); // consume '('
        parseNumericalExpression();
        expectToken(Token::Type::RParen, "Expected ')'");
    } else {
        parseNumericalOperand();

        Token nextToken = peekToken();
        if (isNumericalOperator(nextToken.type())) {
            getToken(); // Consume the operator
            addToCST(createNodePtr(nextToken), RightSibling);

            parseNumericalExpression();
        }
    }
}

void Parser::parseNumericalOperand() {
    Token currToken = getToken();
    if (!match(Token::Type::Identifier, currToken) &&
        !match(Token::Type::WholeNumber, currToken) &&
        !match(Token::Type::Integer, currToken) &&
        !match(Token::Type::Digit, currToken) &&
        !match(Token::Type::HexDigit, currToken)) {
        cerr << "Syntax error: Expected a numerical operand, found '"
             << currToken.value() << "' at line " << currToken.lineNum() << "."
             << endl;
        exit(1);
    }
    addToCST(createNodePtr(currToken), RightSibling);
}

void Parser::parseBooleanExpression() {
    Token currToken = peekToken();

    if (/*match(Token::Type::BooleanTrue, currToken) ||
           match(Token::Type::BooleanFalse, currToken) ||*/
        match(Token::Type::Identifier, currToken)) {
        getToken();
        addToCST(createNodePtr(currToken), RightSibling);

        Token nextToken = peekToken();

        if (isBooleanOperator(nextToken.type())) {
            getToken();
            addToCST(createNodePtr(nextToken), RightSibling);

            parseBooleanExpression();
        }
    } else if (match(Token::Type::LParen, currToken)) {
        getToken();
        parseBooleanExpression();
        expectToken(Token::Type::RParen, "Expected ')'");
    } else {
        parseNumericalExpression();

        Token opToken = getToken();
        if (!isComparisonOperator(opToken.type())) {
            cerr << "Syntax error: Expected a comparison operator, found '"
                 << opToken.value() << "' at line " << opToken.lineNum() << "."
                 << endl;
            exit(1);
        }
        addToCST(createNodePtr(opToken), RightSibling);

        parseNumericalExpression();
    }
}

bool Parser::isBooleanOperator(Token::Type type) {
    return type == Token::Type::BooleanAnd || type == Token::Type::BooleanOr ||
           type == Token::Type::BooleanNot ||
           type == Token::Type::BooleanEqual ||
           type == Token::Type::BooleanNotEqual;
}

bool Parser::isBooleanValue(const std::string &value) {
    return value == "true" || value == "false";
}

bool Parser::isNumericalOperator(Token::Type type) {
    return type == Token::Type::Plus || type == Token::Type::Minus ||
           type == Token::Type::Asterisk || type == Token::Type::Slash ||
           type == Token::Type::Modulo;
}

bool Parser::isComparisonOperator(Token::Type type) {
    return type == Token::Type::Lt || type == Token::Type::Gt ||
           type == Token::Type::LtEqual || type == Token::Type::GtEqual ||
           type == Token::Type::BooleanEqual ||
           type == Token::Type::BooleanNotEqual;
}

// NOTES:
// <PROCEDURE_DECLARATION> ::= procedure <IDENTIFIER> <L_PAREN>
// <PARAMETER_LIST> <R_PAREN> < L_BRACE> <COMPOUND_STATEMENT> <R_BRACE>
// | procedure <IDENTIFIER> <L_PAREN> void <R_PAREN> < L_BRACE>
// <COMPOUND_STATEMENT> <R_BRACE>

// Parses a procedure declaration, including its name, parameter list,
// and body.
void Parser::parseProcedure() {
    // Get and validate the procedure identifier token.
    Token identifier = getToken();
    if (identifier.type() != Token::Type::Identifier) {
        cerr << "Syntax error: Expected an identifier for the "
                "procedure name, found '"
             << identifier.value() << "' at line " << identifier.lineNum()
             << "." << endl;
        exit(1);
    }

    // Create a procedure declaration node with the identifier and add
    // it to the CST.
    NodePtr procedureNode = createNodePtr(identifier);
    addToCST(procedureNode, LeftChild);

    // Expect and validate the left parenthesis '(' token.
    NodePtr lParenNode =
        expectToken(Token::Type::LParen, "Expected '(' after procedure name.");
    addToCST(lParenNode, RightSibling);

    // Peek at the next token to determine if it is 'void' or the start
    // of a parameter list.
    Token next = peekToken();
    if (next.value() == "void") {
        // If 'void', get the token, create a node, and add it to the
        // CST.
        Token voidToken = getToken();
        NodePtr voidNode = createNodePtr(voidToken);
        addToCST(voidNode, RightSibling);
    } else {
        // Parse the parameter list directly without creating a
        // "ParameterList" node.
        parseParameterList();
    }

    // Expect and validate the right parenthesis ')' token.
    NodePtr rParenNode =
        expectToken(Token::Type::RParen, "Expected ')' after parameter list.");
    addToCST(rParenNode, RightSibling);

    // Expect and validate the left brace '{' token to start the
    // procedure body.
    NodePtr lBraceNode = expectToken(
        Token::Type::LBrace, "Expected '{' to start the procedure body.");
    addToCST(lBraceNode, RightSibling);

    // Parse the procedure body (a compound statement).
    parseCompoundStatement();

    // Expect and validate the right brace '}' token to end the
    // procedure.
    NodePtr rBraceNode =
        expectToken(Token::Type::RBrace, "Expected '}' to end the procedure.");
    addToCST(rBraceNode, RightSibling);
}

void Parser::parseFunction() {
    Token return_type = getToken();
    cout << "current return type " << return_type.value() << endl;
    if (!isReserved(return_type.value())) {
        cerr << "Syntax error: Expected an return type for the "
                "function name, found '"
             << return_type.value() << "' at line " << return_type.lineNum()
             << "." << endl;
        exit(10);
    }
    Token identifier = getToken();
    if (identifier.type() != Token::Type::Identifier) {
        cerr << "Syntax error: Expected an identifier for the "
                "function name, found '"
             << identifier.value() << "' at line " << identifier.lineNum()
             << "." << endl;
        exit(20);
    }

    // Create a procedure declaration node with the identifier and add
    // it to the CST.
    NodePtr procedureNode = createNodePtr(identifier);
    addToCST(procedureNode, LeftChild);

    // Expect and validate the left parenthesis '(' token.
    NodePtr lParenNode =
        expectToken(Token::Type::LParen, "Expected '(' after procedure name.");
    addToCST(lParenNode, RightSibling);

    // Peek at the next token to determine if it is 'void' or the start
    // of a parameter list.
    Token next = peekToken();
    if (next.value() == "void") {
        // If 'void', get the token, create a node, and add it to the
        // CST.
        Token voidToken = getToken();
        NodePtr voidNode = createNodePtr(voidToken);
        addToCST(voidNode, RightSibling);
    } else {
        // Parse the parameter list directly without creating a
        // "ParameterList" node.
        parseParameterList();
    }

    // Expect and validate the right parenthesis ')' token.
    NodePtr rParenNode =
        expectToken(Token::Type::RParen, "Expected ')' after parameter list.");
    addToCST(rParenNode, RightSibling);

    // Expect and validate the left brace '{' token to start the
    // procedure body.
    NodePtr lBraceNode = expectToken(
        Token::Type::LBrace, "Expected '{' to start the procedure body.");
    addToCST(lBraceNode, RightSibling);

    // Parse the procedure body (a compound statement).
    parseCompoundStatement();

    // Expect and validate the right brace '}' token to end the
    // procedure.
    NodePtr rBraceNode =
        expectToken(Token::Type::RBrace, "Expected '}' to end the procedure.");
    addToCST(rBraceNode, RightSibling);
}

// Parses the list of parameters for a procedure or function.
NodePtr Parser::parseParameterList() {
    NodePtr firstParam = nullptr; // Will point to the first parameter node.
    NodePtr lastParam = nullptr;  // Tracks the last parameter node added to
                                  // chain the next one as its right sibling.

    // Loop until a ')' token is encountered which indicates the end of
    // the parameter list.
    while (true) {
        Token dataTypeToken = getToken();
        // If ')' is encountered, the parameter list is complete.
        if (dataTypeToken.type() == Token::Type::RParen) {
            current--; // Put back the ')' token for the calling
                       // function.
            break;
        }

        // Check that the current token is a valid data type.
        if (!isDataType(dataTypeToken.value())) {
            cerr << "Expected a data type in parameter list, found '"
                 << dataTypeToken.value() << "' at line "
                 << dataTypeToken.lineNum() << "." << endl;
            exit(1); // Terminate on syntax error.
        }

        // Get the next token, which should be the identifier for the
        // parameter.
        Token paramNameToken = getToken();
        if (paramNameToken.type() != Token::Type::Identifier) {
            cerr << "Expected an identifier for parameter name, found '"
                 << paramNameToken.value() << "' at line "
                 << paramNameToken.lineNum() << "." << endl;
            exit(1); // Terminate on syntax error.
        }

        // Create a node for the data type and the parameter name.
        NodePtr dataTypeNode = createNodePtr(dataTypeToken);
        NodePtr paramNameNode = createNodePtr(paramNameToken);

        // Link the identifier node as the right sibling of the data
        // type node.
        dataTypeNode->addRightSibling(paramNameNode);

        // If this is the first parameter, set the firstParam pointer.
        if (!firstParam) {
            firstParam = dataTypeNode;
        }

        // Chain the parameters: set the last parameter's right sibling
        // to the current data type node.
        if (lastParam) {
            lastParam->addRightSibling(dataTypeNode);
        }
        // Update the last parameter node to be the current identifier
        // node.
        lastParam = paramNameNode;

        // If the next token is a comma, consume it to move on to the
        // next parameter.
        if (peekToken().type() == Token::Type::Comma) {
            getToken(); // Consume the comma token.
        }
    }

    // Return the head of the linked list of parameters.
    return firstParam;
}

void Parser::parseCompoundStatement() {
    // The current implementation builds a subtree for the compound statement
    // and then attaches it to CST

    while (current < tokens.size() &&
           peekToken().type() != Token::Type::RBrace) {
        Token nextToken = peekToken();
        NodePtr newNode = nullptr;

        // Determine the type of statement to parse and add it to the CST.
        if (isDataType(nextToken.value())) {
            newNode = parseDeclarationStatement();
        } else if (nextToken.value() == "if" || nextToken.value() == "else") {
            newNode = parseSelectionStatement();
        } else if (nextToken.value() == "for" || nextToken.value() == "while") {
            newNode = parseIterationStatement();
        } else if (nextToken.value() == "printf") {
            newNode = parsePrintfStatement();
        } else if (nextToken.value() == "return") {
            newNode = parseReturnStatement();
        } else if (nextToken.type() == Token::Type::Identifier) {
            newNode = parseAssignmentStatement();
        } else {
            cerr
                << "Syntax error: Unrecognized statement beginning with token '"
                << nextToken.value() << "' at line " << nextToken.lineNum()
                << "." << endl;
            exit(1);
        }

        // If a new node was created, add it to the CST.
        if (newNode) {
            addToCST(newNode, InsertionMode::RightSibling);
        }
    }
    // Consume the closing '}' token, marking the end of the compound statement.
    if (peekToken().type() == Token::Type::RBrace) {
        getToken(); // This consumes the '}'
    } else {
        cerr << "Syntax error: Expected '}' at the end of compound statement."
             << endl;
        exit(1);
    }
    return;
}

// A helper method to consume the next token and validate its type
// Also add the expected token to the CST if it matches.
NodePtr Parser::expectToken(Token::Type expectedType,
                            const std::string &errorMessage) {
    Token t = getToken();
    if (t.type() != expectedType) {
        cerr << errorMessage << " Found '" << Token::typeToString(t.type())
             << "' at line " << t.lineNum() << "." << endl;
        exit(1);
    }
    // Create a NodePtr from the token and return it
    return createNodePtr(t);
}

// A helper method to peek at the current token without incrementing
// 'current'
Token Parser::peekToken() const {
    if (current >= tokens.size()) {
        throw std::runtime_error(
            "Unexpected end of input while peeking at token.");
    }
    return tokens[current];
}

bool isDataType(string id) {
    if (id == "char" || id == "int" || id == " bool")
        return true;
    return false;
}

bool isReserved(string id) {
    if (id == "char" || id == "int" || id == "bool" || id == "void" ||
        id == "function" || id == "procedure" || id == "main" ||
        id == "return" || id == "printf" || id == "getchar" || id == "if" ||
        id == "else" || id == "for" || id == "while" || id == "TRUE" ||
        id == "FALSE")
        return true;
    return false;
}
