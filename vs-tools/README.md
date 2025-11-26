# http-test VS Code Extension

VS Code extension for running HTTP tests using [@iyulab/http-test](https://github.com/iyulab/http-test) library with enhanced progress tracking and error handling.

![http-test VS Code Extension](screenshot.png)

## Features

- **One-click execution** - Run tests directly from .http files
- **Progress tracking** - Real-time progress with cancellation support
- **Enhanced output** - Colored test results with success/failure indicators
- **Status bar integration** - Quick access when editing .http files
- **Error handling** - Detailed error messages and troubleshooting
- **Test result parsing** - Automatic pass/fail detection and notifications

## Installation

1. Open VS Code Extensions (Ctrl+Shift+X)
2. Search for "http-test"
3. Install the extension

Or install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=iyulab.http-test)

## Usage

### Running Tests

- **Context menu**: Right-click in .http file → "Run HTTP Test"
- **Keyboard**: `Ctrl+Alt+T` (Windows/Linux) or `Cmd+Alt+T` (macOS)
- **Status bar**: Click the HTTP Test icon when editing .http files
- **Command palette**: `Ctrl+Shift+P` → "Run HTTP Test"

### Available Commands

- **Run HTTP Test** - Execute tests with standard output
- **Run HTTP Test (Verbose)** - Execute with detailed logging
- **Stop HTTP Test** - Cancel running tests

### Progress Tracking

- Real-time progress notifications
- Cancellable test execution
- Success/failure status indicators
- Test result summaries

## Requirements

- VS Code 1.104.0 or higher
- Node.js installed ([Download](https://nodejs.org))

## About @iyulab/http-test

Built on the [@iyulab/http-test](https://github.com/iyulab/http-test) library (v1.1.0):

### Supported HTTP Methods
- GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, CONNECT, TRACE

### Assertions
- **Status codes**: `Status: 200`, `Status: 2xx`
- **Headers**: `Content-Type: application/json`
- **Body (JSONPath)**: `$.id: 123`, `$[0].name: John`
- **Custom validators**: `_CustomAssert: ./validator.js`

### Variable Management
- Static variables: `@host = http://localhost:3000`
- Response extraction: `@userId = $.id`
- Dynamic variables: `{{$guid}}`, `{{$timestamp}}`, `{{$randomInt}}`
- Environment variables: `{{$dotenv API_KEY}}`, `{{$processEnv NODE_ENV}}`

### REST Client Compatibility
- Named requests: `# @name myRequest`
- Response references: `{{myRequest.response.body.id}}`
- File body loading: `< ./data/body.json`
- Expected errors: `# @expectError`

## Example .http File

```http
@host = https://api.example.com

### Get all users
GET {{host}}/users

#### Assert
Status: 200
Content-Type: application/json
$.length: 10

###

### Create user
# @name createUser
POST {{host}}/users
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com"
}

#### Assert
Status: 201
$.name: Test User

@newUserId = $.id

###

### Get created user
GET {{host}}/users/{{createUser.response.body.id}}

#### Assert
Status: 200
$.id: {{newUserId}}
```

## Changelog

### 1.1.0
- REST Client compatibility improvements
- Named request references support
- Dynamic variables (`$guid`, `$timestamp`, `$randomInt`, etc.)
- Extended HTTP methods (HEAD, OPTIONS, CONNECT, TRACE)
- Status range assertions (`2xx`, `4xx`, etc.)

## License

MIT
