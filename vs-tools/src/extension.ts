import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

let outputChannel: vscode.OutputChannel;
let currentProcess: ChildProcess | null = null;

interface TestResult {
    success: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
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

            const args = ['-y', '@iyulab/http-test', filePath];
            if (verbose) args.push('--verbose');

            currentProcess = spawn('npx', args, {
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

                // Check for common errors
                if (text.includes('command not found') || text.includes('is not recognized')) {
                    vscode.window.showErrorMessage('npm/npx not found. Please ensure Node.js is installed and in PATH.');
                } else if (text.includes('ENOENT')) {
                    vscode.window.showErrorMessage('File not found. Please check if the .http file exists.');
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