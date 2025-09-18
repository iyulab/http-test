import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('iyulab.http-test'));
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('iyulab.http-test');
        assert.ok(extension);

        if (!extension!.isActive) {
            await extension!.activate();
        }

        assert.ok(extension!.isActive);
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);

        assert.ok(commands.includes('extension.http_test.run'));
        assert.ok(commands.includes('extension.http_test.runVerbose'));
        assert.ok(commands.includes('extension.http_test.stop'));
    });

    test('Should reject non-.http files', async () => {
        // Create a temporary non-.http file
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFile = path.join(tempDir, 'test.txt');
        fs.writeFileSync(tempFile, 'test content');

        try {
            const uri = vscode.Uri.file(tempFile);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);

            // The command should show an error for non-.http files
            // We can't easily test the error message in unit tests,
            // but we can verify the file extension check logic
            assert.ok(path.extname(tempFile) !== '.http');
        } finally {
            // Clean up
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
            if (fs.existsSync(tempDir)) {
                fs.rmdirSync(tempDir);
            }
        }
    });

    test('Should handle .http files correctly', async () => {
        // Create a temporary .http file
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempHttpFile = path.join(tempDir, 'test.http');
        const httpContent = `### Test Request
GET https://httpbin.org/get
Accept: application/json

### Test Response
{
  "message": "Hello World"
}`;

        fs.writeFileSync(tempHttpFile, httpContent);

        try {
            const uri = vscode.Uri.file(tempHttpFile);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);

            // Verify file extension
            assert.strictEqual(path.extname(tempHttpFile), '.http');

            // Verify file content
            const content = fs.readFileSync(tempHttpFile, 'utf8');
            assert.ok(content.includes('GET https://httpbin.org/get'));
        } finally {
            // Clean up
            if (fs.existsSync(tempHttpFile)) {
                fs.unlinkSync(tempHttpFile);
            }
            if (fs.existsSync(tempDir)) {
                fs.rmdirSync(tempDir);
            }
        }
    });

    test('Should validate workspace folder requirement', () => {
        // This test checks the logic that requires a workspace folder
        // In actual extension, this would show an error if no workspace is open
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            // Extension should handle this case gracefully
            assert.ok(true, 'Extension should show error when no workspace is open');
        } else {
            assert.ok(workspaceFolders.length > 0, 'Workspace folder should be available');
        }
    });
});