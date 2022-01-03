// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "color-term" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('colorTerm.create', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from color-term!');

		const nodePty = require('node-pty');
		const writeEmitter = new vscode.EventEmitter<string>();
		const ptyProcess = nodePty.spawn(shell, [], {
			name: 'xterm-color',
			cols: 80,
			rows: 30,
			cwd: process.env.HOME,
			env: process.env
		});

		ptyProcess.on('data', function (data: string) {
			colorText(data);
		});

		const pty = {
			onDidWrite: writeEmitter.event,
			open: () => { },
			close: () => { },
			handleInput: async (char: string) => {
				ptyProcess.write(char);
			},
		};
		const terminal = (<any>vscode.window).createTerminal({
			name: `ColorTerm`,
			pty,
		});
		terminal.show();

		function colorText(data: string) {
			let index = data.indexOf("error");
			if (index >= 0) {
				writeEmitter.fire(data.substring(0, index));
				writeEmitter.fire('\u001b[31m');
				writeEmitter.fire('error');
				writeEmitter.fire('\u001b[0m');
				colorText(data.substring(index + 'error'.length));
			} else {
				writeEmitter.fire(data);
			}
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
