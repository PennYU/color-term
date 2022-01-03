// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';


const COLORS: {[key: string]: string} = {
	"red": "\u001b[31m",
	"green": "\u001b[32m",
	"yellow": "\u001b[33m",
	"blue": "\u001b[34m"
};

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "color-term" is now active!');


	const color = vscode.workspace.getConfiguration().get<string>('conf.colorTerm.highlightColor') || 'red';
	const keywords = vscode.workspace.getConfiguration().get<string[]>('conf.colorTerm.highlightKeywords') || [];

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

		function colorTextFunc(data: string) {
			let [index, kw] = getIndexOf(data);
			if (index >= 0) {
				writeEmitter.fire(data.substring(0, index));
				writeEmitter.fire(COLORS[color]);
				writeEmitter.fire(kw);
				writeEmitter.fire('\u001b[0m');
				colorTextFunc(data.substring(index + kw.length));
			} else {
				writeEmitter.fire(data);
			}
		}

		function getIndexOf(data: string): [number, string] {
			for (let i=0; i<keywords.length; i++) {
				let index = data.indexOf(keywords[i]);
				if (index >= 0) {
					return [index, keywords[i]];	
				}
			}
			return [-1, ""];
		}

		function normalTextFunc(data: string) {
			writeEmitter.fire(data);
		}

		const colorText =  keywords.length > 0 ? colorTextFunc : normalTextFunc; 
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
