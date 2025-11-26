import * as vscode from 'vscode';
import { spawn, ChildProcess, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let outputChannel: vscode.OutputChannel;
let currentProcess: ChildProcess | null = null;

interface TestResult {
    success: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
}

interface ExecutionConfig {
    command: string;
    args: string[];
    method: 'global' | 'npx' | 'local';
}

function parseTestResults(output: string): TestResult {
    const result: TestResult = {
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0
    };

    // Parse test summary from output
    const totalMatch = output.match(/Total Tests:\s*(\d+)/);
    const passedMatch = output.match(/Passed Tests:\s*(\d+)/);
    const failedMatch = output.match(/Failed Tests:\s*(\d+)/);

    if (totalMatch) result.totalTests = parseInt(totalMatch[1]);
    if (passedMatch) result.passedTests = parseInt(passedMatch[1]);
    if (failedMatch) result.failedTests = parseInt(failedMatch[1]);

    result.success = result.failedTests === 0 && result.totalTests > 0;
    return result;
}

/**
 * Check if a command exists in the system
 */
function commandExists(command: string): boolean {
    try {
        const checkCmd = process.platform === 'win32' ? 'where' : 'which';
        execSync(`${checkCmd} ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Find the http-test package path in npm global or local node_modules
 */
function findHttpTestPackage(workspaceRoot: string): string | null {
    // 1. Check local node_modules
    const localPkgPath = path.join(workspaceRoot, 'node_modules', '@iyulab', 'http-test', 'dist', 'program.cjs');
    if (fs.existsSync(localPkgPath)) {
        return localPkgPath;
    }

    // 2. Check global npm directory
    try {
        const npmPrefix = execSync('npm config get prefix', { encoding: 'utf8' }).trim();
        const globalPaths = [
            // Windows: %APPDATA%\npm\node_modules
            path.join(npmPrefix, 'node_modules', '@iyulab', 'http-test', 'dist', 'program.cjs'),
            // Unix-like: /usr/local/lib/node_modules
            path.join(npmPrefix, 'lib', 'node_modules', '@iyulab', 'http-test', 'dist', 'program.cjs')
        ];

        for (const globalPath of globalPaths) {
            if (fs.existsSync(globalPath)) {
                return globalPath;
            }
        }
    } catch {
        // npm config failed, continue
    }

    return null;
}

/**
 * Find the best way to execute http-test
 * Priority: 1. Direct node execution (most reliable), 2. Global command, 3. npx fallback
 */
function findExecutionMethod(workspaceRoot: string): ExecutionConfig | null {
    // 1. Try to find the package and run with node directly (most reliable on Windows)
    const pkgPath = findHttpTestPackage(workspaceRoot);
    if (pkgPath) {
        return {
            command: 'node',
            args: [pkgPath],
            method: pkgPath.includes('node_modules/@iyulab') ? 'local' : 'global'
        };
    }

    // 2. Check global installation via command
    if (commandExists('http-test')) {
        return {
            command: 'http-test',
            args: [],
            method: 'global'
        };
    }

    // 3. Fallback: Use npx with explicit package execution
    if (commandExists('npx') && commandExists('node')) {
        return {
            command: 'npx',
            args: ['--yes', '--package', '@iyulab/http-test', 'http-test'],
            method: 'npx'
        };
    }

    return null;
}

function runHttpTest(uri: vscode.Uri | undefined, verbose: boolean) {
    const filePath = uri ? uri.fsPath : vscode.window.activeTextEditor?.document.fileName;
    if (!filePath || path.extname(filePath) !== '.http') {
        vscode.window.showErrorMessage('This command can only be run on .http files.');
        return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return;
    }

    // Find the best execution method
    const execConfig = findExecutionMethod(workspaceRoot);
    if (!execConfig) {
        const installMessage = 'http-test is not installed. Would you like to install it globally?';
        vscode.window.showErrorMessage(installMessage, 'Install Globally', 'Show Instructions').then(selection => {
            if (selection === 'Install Globally') {
                const terminal = vscode.window.createTerminal('http-test Installation');
                terminal.show();
                terminal.sendText('npm install -g @iyulab/http-test');
                vscode.window.showInformationMessage('Installing @iyulab/http-test globally. Please run the test again after installation completes.');
            } else if (selection === 'Show Instructions') {
                outputChannel.clear();
                outputChannel.show(true);
                outputChannel.appendLine('═'.repeat(80));
                outputChannel.appendLine('📦 http-test Installation Instructions');
                outputChannel.appendLine('═'.repeat(80));
                outputChannel.appendLine('');
                outputChannel.appendLine('Option 1: Install globally (recommended)');
                outputChannel.appendLine('  npm install -g @iyulab/http-test');
                outputChannel.appendLine('');
                outputChannel.appendLine('Option 2: Install as project dependency');
                outputChannel.appendLine('  npm install --save-dev @iyulab/http-test');
                outputChannel.appendLine('');
                outputChannel.appendLine('Option 3: Use npx (requires npm 5.2+)');
                outputChannel.appendLine('  Ensure Node.js and npm are installed and in PATH');
                outputChannel.appendLine('');
                outputChannel.appendLine('After installation, run the HTTP Test command again.');
                outputChannel.appendLine('═'.repeat(80));
            }
        });
        return;
    }

    // Kill any existing process
    if (currentProcess) {
        currentProcess.kill();
        currentProcess = null;
    }

    outputChannel.clear();
    outputChannel.show(true);

    const fileName = path.basename(filePath);
    outputChannel.appendLine(`🚀 Starting HTTP Test for file: ${fileName}`);
    outputChannel.appendLine(`📁 Working directory: ${workspaceRoot}`);
    outputChannel.appendLine(`🔧 Execution method: ${execConfig.method}`);
    outputChannel.appendLine('═'.repeat(80));

    // Show progress with cancellation support
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Running HTTP Test: ${fileName}`,
        cancellable: true
    }, (progress, token) => {
        return new Promise<void>((resolve, reject) => {
            token.onCancellationRequested(() => {
                if (currentProcess) {
                    currentProcess.kill();
                    currentProcess = null;
                    outputChannel.appendLine('\n❌ Test execution cancelled by user');
                    reject(new Error('Cancelled'));
                }
            });

            progress.report({ increment: 0, message: "Initializing..." });

            const args = [...execConfig.args, filePath];
            if (verbose) args.push('--verbose');

            currentProcess = spawn(execConfig.command, args, {
                cwd: workspaceRoot,
                shell: true
            });

            if (!currentProcess) {
                const errorMsg = 'Failed to start HTTP test process';
                vscode.window.showErrorMessage(errorMsg);
                outputChannel.appendLine(`❌ ${errorMsg}`);
                reject(new Error(errorMsg));
                return;
            }

            progress.report({ increment: 25, message: "Executing tests..." });

            let outputBuffer = '';
            let hasStarted = false;

            currentProcess.stdout?.on('data', (data) => {
                const text = data.toString();
                outputBuffer += text;
                outputChannel.append(text);

                if (!hasStarted && text.includes('Starting test run')) {
                    hasStarted = true;
                    progress.report({ increment: 50, message: "Tests running..." });
                }
            });

            currentProcess.stderr?.on('data', (data) => {
                const text = data.toString();
                outputChannel.append(text);

                // Check for common errors and provide helpful messages
                if (text.includes('command not found') || text.includes('is not recognized')) {
                    vscode.window.showErrorMessage(
                        'http-test command not found. Please install it: npm install -g @iyulab/http-test',
                        'Install Now'
                    ).then(selection => {
                        if (selection === 'Install Now') {
                            const terminal = vscode.window.createTerminal('http-test Installation');
                            terminal.show();
                            terminal.sendText('npm install -g @iyulab/http-test');
                        }
                    });
                } else if (text.includes('ENOENT')) {
                    vscode.window.showErrorMessage('File not found. Please check if the .http file exists.');
                } else if (text.includes('ECONNREFUSED') || text.includes('Server is not responding')) {
                    // Don't show error for server connection issues - they'll be shown in results
                } else if (text.includes('MODULE_NOT_FOUND')) {
                    vscode.window.showErrorMessage(
                        'Node.js module error. Try reinstalling: npm install -g @iyulab/http-test',
                        'Reinstall'
                    ).then(selection => {
                        if (selection === 'Reinstall') {
                            const terminal = vscode.window.createTerminal('http-test Installation');
                            terminal.show();
                            terminal.sendText('npm uninstall -g @iyulab/http-test && npm install -g @iyulab/http-test');
                        }
                    });
                }
            });

            currentProcess.on('error', (error) => {
                const errorMsg = `Failed to execute HTTP test: ${error.message}`;
                vscode.window.showErrorMessage(errorMsg);
                outputChannel.appendLine(`❌ ${errorMsg}`);
                reject(error);
            });

            currentProcess.on('close', (code) => {
                currentProcess = null;
                progress.report({ increment: 100, message: "Completed" });

                outputChannel.appendLine('\n' + '═'.repeat(80));

                if (code === 0) {
                    const testResult = parseTestResults(outputBuffer);
                    if (testResult.totalTests > 0) {
                        const statusIcon = testResult.success ? '✅' : '❌';
                        const statusMsg = `${statusIcon} HTTP Test completed: ${testResult.passedTests}/${testResult.totalTests} passed`;
                        outputChannel.appendLine(statusMsg);

                        if (testResult.success) {
                            vscode.window.showInformationMessage(statusMsg);
                        } else {
                            vscode.window.showWarningMessage(statusMsg);
                        }
                    } else {
                        outputChannel.appendLine('✅ HTTP Test completed successfully');
                    }
                } else {
                    const errorMsg = `❌ HTTP Test failed with exit code: ${code}`;
                    outputChannel.appendLine(errorMsg);
                    vscode.window.showErrorMessage(errorMsg);
                }

                resolve();
            });
        });
    });
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('HTTP Test');

    // Register commands
    const disposableRun = vscode.commands.registerCommand('extension.http_test.run', (uri: vscode.Uri) => {
        runHttpTest(uri, false);
    });

    const disposableRunVerbose = vscode.commands.registerCommand('extension.http_test.runVerbose', (uri: vscode.Uri) => {
        runHttpTest(uri, true);
    });

    const disposableStop = vscode.commands.registerCommand('extension.http_test.stop', () => {
        if (currentProcess) {
            currentProcess.kill();
            currentProcess = null;
            outputChannel.appendLine('\n🛑 Test execution stopped by user');
            vscode.window.showInformationMessage('HTTP Test execution stopped');
        } else {
            vscode.window.showInformationMessage('No HTTP Test is currently running');
        }
    });

    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'extension.http_test.run';
    statusBarItem.text = '$(testing-run-icon) HTTP Test';
    statusBarItem.tooltip = 'Run HTTP Test on current .http file';

    // Show status bar item only for .http files
    const updateStatusBar = () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && path.extname(activeEditor.document.fileName) === '.http') {
            statusBarItem.show();
        } else {
            statusBarItem.hide();
        }
    };

    // Update status bar on editor change
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar);
    updateStatusBar(); // Initial update

    context.subscriptions.push(
        disposableRun,
        disposableRunVerbose,
        disposableStop,
        statusBarItem,
        outputChannel
    );
}

export function deactivate() {
    // Clean up any running processes
    if (currentProcess) {
        currentProcess.kill();
        currentProcess = null;
    }

    if (outputChannel) {
        outputChannel.dispose();
    }
}