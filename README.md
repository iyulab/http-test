# http-test

[![npm version](https://img.shields.io/npm/v/@iyulab/http-test.svg)](https://www.npmjs.com/package/@iyulab/http-test)
[![npm downloads](https://img.shields.io/npm/dm/@iyulab/http-test.svg)](https://www.npmjs.com/package/@iyulab/http-test)
[![license](https://img.shields.io/npm/l/@iyulab/http-test.svg)](https://github.com/iyulab/http-test/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/@iyulab/http-test.svg)](https://www.npmjs.com/package/@iyulab/http-test)

An API testing library that executes HTTP tests written in .http files with automatic assertion capabilities.

## VS Code Extension

Use the [http-test VS Code Extension](https://marketplace.visualstudio.com/items?itemName=iyulab.http-test) for integrated testing within your editor.

![VS Code Extension Screenshot](screenshot.png)

## Features

- **.http file support** - Standard HTTP file format compatible with REST Client
- **All HTTP methods** - GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, CONNECT, TRACE
- **Automatic assertions** - Status codes, headers, response body with JSONPath
- **JSON Schema validation** - Validate responses against JSON Schema (Draft-07)
- **Variable management** - Dynamic variables, environment variables, named request references
- **OAuth2 authentication** - Client credentials, password, and refresh token grants
- **Custom assertions** - JavaScript-based validation functions
- **File upload testing** - Multipart form data support
- **Named requests** - Reference responses from previous requests using `@name` directive
- **Dynamic variables** - Built-in `$guid`, `$timestamp`, `$randomInt`, `$datetime`, etc.
- **Parallel execution** - Run multiple requests concurrently with configurable limits
- **Request caching** - TTL-based caching with LRU eviction
- **Detailed reporting** - Test summaries with pass/fail status

## Installation

```bash
npm install -g @iyulab/http-test
```

## Usage

```bash
http-test tests.http
http-test tests.http --verbose
http-test tests.http --var variables.json
```

## Writing Tests

http-test uses a simple syntax for defining API tests in .http files.

### Basic Request

```http
### GET all users
GET {{host}}/users
```

### Status Code Assertions

Check the status code of the response:

```http
### GET all users
GET {{host}}/users

#### Assert: Check status code
Status: 200
```

Status range assertions are also supported:

```http
#### Assert: Check 2xx status
Status: 2xx
```

### Header Assertions

Assert response headers:

```http
### GET all users
GET {{host}}/users

#### Assert: Check headers
Status: 200
Content-Type: application/json
```

### JSONPath Body Assertions

Use JSONPath to assert specific values in the response body:

```http
### GET all users
GET {{host}}/users

#### Assert: Check response body
Status: 200
$.length: 10
$[0].id: 1
$[0].name: John Doe
```

### Setting Variables from Response

Save values from the response to use in subsequent requests:

```http
### POST new user
POST {{host}}/users
Content-Type: application/json

{
  "name": "Alice Johnson",
  "email": "alice@example.com"
}

#### Assert: Check new user creation
Status: 201
$.name: Alice Johnson

# Save new user ID to variable
@newUserId = $.id
```

### Named Requests (REST Client Compatible)

Use `@name` directive to reference responses from previous requests:

```http
### Create user
# @name createUser
POST {{host}}/users
Content-Type: application/json

{
  "name": "Test User"
}

###

### Get created user
GET {{host}}/users/{{createUser.response.body.id}}

#### Assert
Status: 200
$.name: Test User
```

Available reference paths:
- `{{requestName.response.body}}` - Full response body
- `{{requestName.response.body.field}}` - Specific field from body
- `{{requestName.response.status}}` - Response status code
- `{{requestName.response.headers.header-name}}` - Response header

### Dynamic Variables

Built-in dynamic variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `$guid` / `$uuid` | Random UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| `$timestamp` | Unix timestamp | `1699876543` |
| `$randomInt` | Random integer (0-1000) | `42` |
| `$randomInt min max` | Random integer in range | `{{$randomInt 1 100}}` |
| `$datetime` | ISO8601 datetime | `2024-01-15T10:30:00Z` |
| `$datetime format` | Custom format | `{{$datetime rfc1123}}` |
| `$localDatetime` | Local datetime | `2024-01-15T10:30:00` |
| `$dotenv NAME` | Value from .env file | `{{$dotenv API_KEY}}` |
| `$processEnv NAME` | Environment variable | `{{$processEnv NODE_ENV}}` |

### JSON Schema Validation

Validate response body against JSON Schema:

```http
### Get user
GET {{host}}/users/1

#### Assert: Validate with inline schema
Status: 200
_JsonSchema: {
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": { "type": "number" },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" }
  }
}
```

Or reference an external schema file:

```http
#### Assert: Validate with schema file
_JsonSchema: ./schemas/user.schema.json
```

### Custom Assertions

JavaScript functions for complex validations:

```javascript
// validation.js
module.exports = function(response, context) {
  const body = response.data;
  const variables = context.variables;

  if (!body.email.includes('@')) {
    throw new Error("Invalid email format");
  }

  return true;
};
```

Usage in .http files:

```http
### Verify user data
GET {{host}}/users/{{newUserId}}

#### Assert: Validate response
Status: 200
_CustomAssert: ./validation.js
```

### File Uploads

Test file uploads using `multipart/form-data`:

```http
### Upload file
POST {{host}}/upload
Content-Type: multipart/form-data; boundary=---boundary
Content-Disposition: form-data; name="file"; filename="example.txt"

This is the content of the file.
```

### Request Body from File

Load request body from external file:

```http
### POST with external body
POST {{host}}/api/data
Content-Type: application/json

< ./data/request-body.json
```

### Variables

External variable file (`variables.json`):

```json
{
  "host": "http://localhost:3000",
  "apiKey": "your-api-key"
}
```

Usage:

```bash
http-test tests.http --var variables.json
```

Or inline in .http files:

```http
@host = http://localhost:3000
@apiKey = your-api-key

### Get users with authentication
GET {{host}}/users
Authorization: Bearer {{apiKey}}
```

### Expected Errors

Test error scenarios with `@expectError`:

```http
### Test 404 error
# @expectError
GET {{host}}/nonexistent

#### Assert
Status: 404
```

## Configuration

Create `http-test.config.json` for custom settings:

```json
{
  "timeout": 30000,
  "retry": 3,
  "verbose": false
}
```

## API Usage

Use as a library in your Node.js applications:

```typescript
import { TestManager, VariableManager, HttpFileParser } from '@iyulab/http-test';

const variableManager = new VariableManager();
variableManager.setVariable('host', 'http://localhost:3000');

const parser = new HttpFileParser(variableManager);
const requests = await parser.parse('./tests/api.http');

const testManager = new TestManager(variableManager);
const { results, summary } = await testManager.run(requests, { verbose: true });

console.log(`Passed: ${summary.passedTests}/${summary.totalTests}`);
```

### OAuth2 Authentication

```typescript
import { OAuth2Provider } from '@iyulab/http-test';

const oauth = new OAuth2Provider({
  tokenUrl: 'https://auth.example.com/oauth/token',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret'
});

// Client credentials grant
const token = await oauth.getToken({ grantType: 'client_credentials' });

// Password grant
const token = await oauth.getToken({
  grantType: 'password',
  username: 'user',
  password: 'pass'
});
```

### Parallel Execution

```typescript
import { ParallelExecutor } from '@iyulab/http-test';

const executor = new ParallelExecutor({
  maxConcurrency: 5,
  execute: async (request) => { /* execute request */ }
});

const results = await executor.execute(requests, {
  onProgress: (completed, total) => console.log(`${completed}/${total}`)
});
```

### Request Caching

```typescript
import { RequestCache } from '@iyulab/http-test';

const cache = new RequestCache({
  ttl: 60000,        // 1 minute TTL
  maxSize: 100,      // Max 100 entries
  cacheableMethods: ['GET']
});

cache.set(request, response);
const cached = cache.get(request);
console.log(cache.getStats()); // { hits, misses, hitRate }
```

## API Reference

### Assertion Syntax

| Type | Syntax | Example |
|------|--------|---------|
| Status | `Status: <code>` | `Status: 200`, `Status: 2xx` |
| Header | `<header-name>: <value>` | `Content-Type: application/json` |
| Body | `$.<path>: <value>` | `$.id: 123`, `$[0].name: John` |
| JSON Schema | `_JsonSchema: <schema>` | `_JsonSchema: ./user.schema.json` |
| Custom | `_CustomAssert: <file>` | `_CustomAssert: ./validator.js` |

### Variable Syntax

| Type | Syntax | Description |
|------|--------|-------------|
| Static | `@name = value` | Define variable |
| Reference | `{{name}}` | Use variable |
| Response | `@var = $.path` | Extract from response |
| Dynamic | `{{$guid}}` | Built-in dynamic variable |
| Named | `{{req.response.body.id}}` | Reference named request |

## License

MIT
