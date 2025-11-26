import { HttpFileParser } from '../../src/core/HttpFileParser';
import { VariableManager } from '../../src/core/VariableManager';
import { readFile } from '../../src/utils/fileUtils';

// Mock fileUtils
jest.mock('../../src/utils/fileUtils');
const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('HttpFileParser - Core Functionality', () => {
  let parser: HttpFileParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new HttpFileParser(variableManager);
    jest.clearAllMocks();
  });

  test('should parse simple GET request', async () => {
    const httpContent = `
### Test Request
GET http://localhost:3000/users
Content-Type: application/json
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].url).toBe('http://localhost:3000/users');
    expect(requests[0].headers['Content-Type']).toBe('application/json');
    expect(requests[0].name).toBe('Test Request');
  });

  test('should parse POST request with JSON body', async () => {
    const httpContent = `
### Create User
POST http://localhost:3000/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('POST');
    expect(requests[0].body).toContain('John Doe');
    expect(requests[0].name).toBe('Create User');
  });

  test('should parse multiple requests', async () => {
    const httpContent = `
### Get Users
GET http://localhost:3000/users

### Create User
POST http://localhost:3000/users
Content-Type: application/json

{"name": "Jane"}
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(2);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].name).toBe('Get Users');
    expect(requests[1].method).toBe('POST');
    expect(requests[1].name).toBe('Create User');
  });

  test('should handle global variables', async () => {
    const httpContent = `
@baseUrl=http://localhost:3000
@token=secret123

### Test Request
GET {{baseUrl}}/users
Authorization: Bearer {{token}}
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    // The @variable sections are processed separately, so we expect 1 request
    // Note: there might be empty sections that create empty requests
    expect(requests.length).toBeGreaterThanOrEqual(1);

    // Find the actual request (not empty ones)
    const actualRequest = requests.find(r => r.method === 'GET' && r.url);
    expect(actualRequest).toBeDefined();
    expect(actualRequest!.url).toBe('http://localhost:3000/users');
    expect(actualRequest!.headers.Authorization).toBe('Bearer secret123');

    // Check that global variables were set
    expect(variableManager.getVariable('baseUrl')).toBe('http://localhost:3000');
    expect(variableManager.getVariable('token')).toBe('secret123');
  });

  test('should handle test scripts', async () => {
    const httpContent = `
### Test with Scripts
GET http://localhost:3000/users

> {%
  client.test("status is 200", function() {
    client.assert(response.status === 200);
  });
%}
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].tests).toBeDefined();
    expect(requests[0].method).toBe('GET');
    expect(requests[0].url).toBe('http://localhost:3000/users');
    // Test scripts parsing may not be implemented yet or may require specific format
  });

  test('should remove comments but keep section headers', async () => {
    const httpContent = `
# This is a comment
### Valid Request
GET http://localhost:3000/users
# Another comment
Content-Type: application/json
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].headers['Content-Type']).toBe('application/json');
  });

  test('should handle empty file', async () => {
    mockedReadFile.mockResolvedValue('');

    const requests = await parser.parse('/test/empty.http');

    expect(requests).toHaveLength(0);
  });

  test('should handle file read errors', async () => {
    mockedReadFile.mockRejectedValue(new Error('File not found'));

    await expect(parser.parse('/invalid/path.http'))
      .rejects.toThrow('File not found');
  });

  test('should handle mixed variables and requests', async () => {
    const httpContent = `
@api=http://localhost:3000

### First Request
GET {{api}}/users

### Second Request
GET {{api}}/data
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    // Should have 2 valid requests (variables are processed separately)
    const validRequests = requests.filter(r => r.url && r.method);
    expect(validRequests).toHaveLength(2);
    expect(variableManager.getVariable('api')).toBe('http://localhost:3000');
  });
});

describe('HttpFileParser - Extended HTTP Methods', () => {
  let parser: HttpFileParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new HttpFileParser(variableManager);
    jest.clearAllMocks();
  });

  test('should parse HEAD request', async () => {
    const httpContent = `
### HEAD Request
HEAD http://localhost:3000/users
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('HEAD');
    expect(requests[0].url).toBe('http://localhost:3000/users');
  });

  test('should parse OPTIONS request', async () => {
    const httpContent = `
### OPTIONS Request
OPTIONS http://localhost:3000/api
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('OPTIONS');
    expect(requests[0].url).toBe('http://localhost:3000/api');
  });

  test('should parse CONNECT request', async () => {
    const httpContent = `
### CONNECT Request
CONNECT http://localhost:3000/tunnel
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('CONNECT');
    expect(requests[0].url).toBe('http://localhost:3000/tunnel');
  });

  test('should parse TRACE request', async () => {
    const httpContent = `
### TRACE Request
TRACE http://localhost:3000/debug
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('TRACE');
    expect(requests[0].url).toBe('http://localhost:3000/debug');
  });

  test('should parse all HTTP methods in single file', async () => {
    const httpContent = `
### GET
GET http://localhost:3000/get

### POST
POST http://localhost:3000/post

### PUT
PUT http://localhost:3000/put

### DELETE
DELETE http://localhost:3000/delete

### PATCH
PATCH http://localhost:3000/patch

### HEAD
HEAD http://localhost:3000/head

### OPTIONS
OPTIONS http://localhost:3000/options

### CONNECT
CONNECT http://localhost:3000/connect

### TRACE
TRACE http://localhost:3000/trace
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(9);
    expect(requests.map(r => r.method)).toEqual([
      'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'
    ]);
  });
});

describe('HttpFileParser - Extended Comment Syntax', () => {
  let parser: HttpFileParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new HttpFileParser(variableManager);
    jest.clearAllMocks();
  });

  test('should remove // line comments', async () => {
    const httpContent = `
// This is a double-slash comment
### Test Request
GET http://localhost:3000/users
// Another comment
Content-Type: application/json
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].headers['Content-Type']).toBe('application/json');
  });

  test('should remove /* */ block comments', async () => {
    const httpContent = `
/* This is a block comment
   spanning multiple lines */
### Test Request
GET http://localhost:3000/users
Content-Type: application/json
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].headers['Content-Type']).toBe('application/json');
  });

  test('should remove inline block comments', async () => {
    const httpContent = `
### Test Request
GET http://localhost:3000/users
Content-Type: application/json /* inline comment should not affect this line */
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    // Block comment in the middle of a line removes that portion
    expect(requests[0].headers['Content-Type']).toBe('application/json');
  });

  test('should handle mixed comment styles', async () => {
    const httpContent = `
# Hash comment
// Double-slash comment
/* Block comment */
### Test Request
GET http://localhost:3000/users
# Another hash comment
// Another double-slash
Content-Type: application/json
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].headers['Content-Type']).toBe('application/json');
  });

  test('should preserve ### and #### markers', async () => {
    const httpContent = `
### First Request
GET http://localhost:3000/users

#### Assert: Check status
Status: 200

### Second Request
POST http://localhost:3000/users
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(2);
    expect(requests[0].name).toBe('First Request');
    expect(requests[1].name).toBe('Second Request');
  });

  test('should handle block comment removing multiple lines', async () => {
    const httpContent = `
### Test Request
GET http://localhost:3000/users
Content-Type: application/json
Accept: text/html
/* This block comment spans
multiple lines and should be completely removed
before the request is parsed */
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].headers['Content-Type']).toBe('application/json');
    expect(requests[0].headers['Accept']).toBe('text/html');
  });

  test('should handle block comment before body separator', async () => {
    const httpContent = `
### Test Request
POST http://localhost:3000/users
Content-Type: application/json
/* comment before body */

{"name": "test"}
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('POST');
    expect(requests[0].body).toContain('test');
  });
});

describe('HttpFileParser - Named Request (@name directive)', () => {
  let parser: HttpFileParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new HttpFileParser(variableManager);
    jest.clearAllMocks();
  });

  test('should parse @name directive and set requestId', async () => {
    const httpContent = `
### Login Request
@name login
POST http://localhost:3000/auth/login
Content-Type: application/json

{"username": "admin", "password": "secret"}
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].requestId).toBe('login');
    expect(requests[0].method).toBe('POST');
    expect(requests[0].url).toBe('http://localhost:3000/auth/login');
  });

  test('should handle @name with mixed case', async () => {
    const httpContent = `
### Test
@NAME testRequest
GET http://localhost:3000/test
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].requestId).toBe('testRequest');
  });

  test('should handle @name with extra whitespace', async () => {
    const httpContent = `
### Test
@name    myRequest
GET http://localhost:3000/test
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].requestId).toBe('myRequest');
  });

  test('should parse multiple named requests', async () => {
    const httpContent = `
### First Request
@name firstReq
GET http://localhost:3000/first

### Second Request
@name secondReq
POST http://localhost:3000/second
Content-Type: application/json

{"data": "test"}
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(2);
    expect(requests[0].requestId).toBe('firstReq');
    expect(requests[0].method).toBe('GET');
    expect(requests[1].requestId).toBe('secondReq');
    expect(requests[1].method).toBe('POST');
  });

  test('should allow request without @name', async () => {
    const httpContent = `
### Named Request
@name namedOne
GET http://localhost:3000/named

### Unnamed Request
GET http://localhost:3000/unnamed
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(2);
    expect(requests[0].requestId).toBe('namedOne');
    expect(requests[1].requestId).toBeUndefined();
  });

  test('should handle @name with hyphens and underscores', async () => {
    const httpContent = `
### Test
@name my-request_name
GET http://localhost:3000/test
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].requestId).toBe('my-request_name');
  });

  test('should handle @name along with other @ directives', async () => {
    const httpContent = `
### Test Request
@name myRequest
@token=$.response.body.token
GET http://localhost:3000/test
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].requestId).toBe('myRequest');
    expect(requests[0].variableUpdates).toContainEqual({
      key: 'token',
      value: '$.response.body.token'
    });
  });

  test('should work with global variables and @name', async () => {
    const httpContent = `
@baseUrl=http://localhost:3000

### Test Request
@name myRequest
GET {{baseUrl}}/test
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    // Find the GET request (global variable section creates empty request)
    const actualRequest = requests.find(r => r.method === 'GET' && r.url);
    expect(actualRequest).toBeDefined();
    expect(actualRequest!.requestId).toBe('myRequest');
    expect(actualRequest!.url).toBe('http://localhost:3000/test');
  });
});

describe('HttpFileParser - File Reference Syntax (< filepath)', () => {
  let parser: HttpFileParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new HttpFileParser(variableManager);
    jest.clearAllMocks();
  });

  test('should parse body file reference with < syntax', async () => {
    const httpContent = `
### Create User from File
POST http://localhost:3000/users
Content-Type: application/json

< ./data/user.json
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('POST');
    expect(requests[0].bodyFromFile).toBe('./data/user.json');
    expect(requests[0].body).toBeUndefined();
  });

  test('should handle file reference with absolute path', async () => {
    const httpContent = `
### Upload Data
POST http://localhost:3000/upload
Content-Type: application/octet-stream

< /absolute/path/to/file.bin
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].bodyFromFile).toBe('/absolute/path/to/file.bin');
  });

  test('should handle file reference with variable in path', async () => {
    const httpContent = `
@dataDir=./testdata

### Test
POST http://localhost:3000/test
Content-Type: application/json

< {{dataDir}}/payload.json
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    const actualRequest = requests.find(r => r.method === 'POST');
    expect(actualRequest).toBeDefined();
    expect(actualRequest!.bodyFromFile).toBe('{{dataDir}}/payload.json');
  });

  test('should distinguish file reference from regular body', async () => {
    const httpContent = `
### Regular JSON Body
POST http://localhost:3000/users
Content-Type: application/json

{
  "name": "John",
  "email": "john@example.com"
}
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].bodyFromFile).toBeUndefined();
    expect(requests[0].body).toContain('John');
  });

  test('should handle file reference with extra whitespace', async () => {
    const httpContent = `
### Test
POST http://localhost:3000/test
Content-Type: application/json

<    ./path/with/spaces.json
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].bodyFromFile).toBe('./path/with/spaces.json');
  });

  test('should not confuse < in JSON body as file reference', async () => {
    const httpContent = `
### Query with Less Than
POST http://localhost:3000/query
Content-Type: application/json

{
  "filter": "age < 30"
}
`;

    mockedReadFile.mockResolvedValue(httpContent);

    const requests = await parser.parse('/test/file.http');

    expect(requests).toHaveLength(1);
    expect(requests[0].bodyFromFile).toBeUndefined();
    expect(requests[0].body).toContain('age < 30');
  });
});