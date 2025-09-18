# http-test

An API testing library that executes HTTP tests written in .http files with automatic assertion capabilities.

## VS Code Extension

Use the [http-test VS Code Extension](https://marketplace.visualstudio.com/items?itemName=iyulab.http-test) for integrated testing within your editor.

![VS Code Extension Screenshot](screenshot.png)

## Features

- **.http file support** - Standard HTTP file format
- **Multiple HTTP methods** - GET, POST, PUT, DELETE, PATCH
- **Automatic assertions** - Status codes, headers, response body
- **Variable management** - Dynamic request data with JSONPath
- **Custom assertions** - JavaScript-based validation functions
- **File upload testing** - Multipart form data support
- **Detailed reporting** - Test summaries with pass/fail status

## Installation

```bash
npm install -g @iyulab/http-test
```

## Usage

```bash
http-test tests.http
http-test tests.http --verbose
```

## Writing Tests

http-test uses a simple syntax for defining API tests in .http files:

### Status Code Assertions

Check the status code of the response:

```http
### GET all users
GET {{host}}/users

#### Assert: Check status code
Status: 200
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

### JSONPath Assertions

Use JSONPath to assert specific values in the response body:

```http
### GET all users
GET {{host}}/users

#### Assert: Check response body
Status: 200
Content-Type: application/json
Body:
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
Content-Type: application/json
Body:
$.name: Alice Johnson
$.email: alice@example.com

# Save new user ID to variable
@newUserId = $.id
```

### Custom Assertions

JavaScript functions for complex validations:

```javascript
// validation.js
module.exports = function(context) {
  const body = context.response.data;
  const variables = context.variables;

  if (body.id !== variables.newUserId) {
    throw new Error("ID mismatch");
  }

  return body.email.includes('@');
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

### Variables

External variable file (`variables.json`):

```json
{
  "host": "http://localhost:3000",
  "apiKey": "your-api-key"
}
```

Usage in .http files:

```http
### Get users with authentication
GET {{host}}/users
Authorization: Bearer {{apiKey}}
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

## API Reference

- **Status codes**: `200`, `2xx`, `404`
- **Headers**: `Content-Type: application/json`
- **JSONPath**: `$.data[0].id`, `$[*].name`
- **Variables**: `@name = $.id`, `{{variable}}`
- **Custom assertions**: `_CustomAssert: ./script.js`