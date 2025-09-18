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

Built on the [@iyulab/http-test](https://github.com/iyulab/http-test) library for:
- HTTP method support (GET, POST, PUT, DELETE, PATCH)
- Variable and environment management
- Response validation and assertions
- Custom JavaScript validation functions
- File upload testing support
