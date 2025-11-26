# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2024-11-26

### Added
- **REST Client Compatibility**
  - `@name` directive support for named requests
  - Named request reference syntax: `{{requestName.response.body.field}}`
  - `< filepath` syntax for loading request body from external files
  - `@expectError` directive for testing error scenarios

- **Extended HTTP Methods**
  - Added support for HEAD, OPTIONS, CONNECT, TRACE methods

- **Dynamic Variables**
  - `$guid` / `$uuid` - Random UUID v4 generation
  - `$timestamp` - Unix timestamp
  - `$randomInt` - Random integer with optional range
  - `$datetime` - ISO8601 datetime with format options
  - `$localDatetime` - Local datetime
  - `$dotenv` - Read values from .env files
  - `$processEnv` - Read environment variables

- **Enhanced Comment Syntax**
  - Support for `//` line comments
  - Support for `/* */` block comments

- **Status Range Assertions**
  - Support for `2xx`, `3xx`, `4xx`, `5xx` status patterns

### Changed
- Custom assertions now use file path syntax: `_CustomAssert: ./validator.js`
- Improved JSONPath body assertions with `$.` prefix
- Header assertions now use direct header name without prefix
- Enhanced error messages with detailed context

### Fixed
- Variable replacement in nested contexts
- JSON parsing with JSON5 fallback for lenient parsing
- Multipart form data boundary handling

### Removed
- Inline JavaScript custom assertions (security improvement)
- Deprecated `body.` and `header.` prefixes in assertions

## [1.0.19] - 2024-11-20

### Fixed
- Minor bug fixes and stability improvements

## [1.0.17] - 2024-11-15

### Changed
- Dependency updates

## [1.0.16] - 2024-11-10

### Added
- Initial public release
- Basic .http file parsing
- Status, header, and body assertions
- Variable management
- Custom JavaScript validators
- File upload support
- CLI tool
