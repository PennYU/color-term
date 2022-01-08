// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';

const NAME = "ColorTerm";
const COLORS: {[key: string]: string} = {
	"red": "\u001b[31m",
	"green": "\u001b[32m",
	"yellow": "\u001b[33m",
	"blue": "\u001b[34m"
};

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

function getCoreNodeModule(moduleName: string) {
    try {
        return require(`${vscode.env.appRoot}/node_modules.asar/${moduleName}`);
    } catch (err) {
		console.log(`import "${moduleName}" failed.`);
	 }

    try {
        return require(`${vscode.env.appRoot}/node_modules/${moduleName}`);
    } catch (err) { 
		console.log(`import "${moduleName}" failed.`);
	}

    return null;
}

function colorTextFunc(data: string, keywords: string[], color:string, writeEmitter: vscode.EventEmitter<string>) {
	let [index, kw] = getIndexOf(data, keywords);
	if (index >= 0) {
		writeEmitter.fire(data.substring(0, index));
		writeEmitter.fire(COLORS[color]);
		writeEmitter.fire(kw);
		writeEmitter.fire('\u001b[0m');
		colorTextFunc(data.substring(index + kw.length), keywords, color, writeEmitter);
	} else {
		writeEmitter.fire(data);
	}
}

function getIndexOf(data: string, keywords: string[]): [number, string] {
	for (let i=0; i<keywords.length; i++) {
		let index = data.indexOf(keywords[i]);
		if (index >= 0) {
			return [index, keywords[i]];	
		}
	}
	return [-1, ""];
}

function createPtyOptions(keywords: string[], color: string) {
	let ptyProcess: any; 
	const nodePty = getCoreNodeModule('node-pty');
	const writeEmitter = new vscode.EventEmitter<string>();
	const closeEmitter = new vscode.EventEmitter<void>();
	const pty = {
		onDidWrite: writeEmitter.event,
		onDidClose: closeEmitter.event,
		open: (initialDimensions: vscode.TerminalDimensions | undefined) => { 
			ptyProcess = nodePty.spawn(shell, [], {
				name: 'xterm-color',
				cols: initialDimensions?.columns || 80,
				rows: initialDimensions?.rows || 30,
				cwd: process.env.HOME,
				env: process.env
			});
			ptyProcess.on('data', (data: string) => {
				colorTextFunc(data, keywords, color, writeEmitter);
			});
			ptyProcess.on('exit', () => {
				closeEmitter.fire();
				writeEmitter.dispose();
				closeEmitter.dispose();
			});
		},
		close: () => { 
			ptyProcess?.kill();
			writeEmitter.dispose();
			closeEmitter.dispose();
		},
		setDimensions: (dimensions: vscode.TerminalDimensions) => {
			ptyProcess?.resize(dimensions.columns, dimensions.rows);
		},
		handleInput: async (char: string) => {
			ptyProcess?.write(char);
		},
	};
	return {name: NAME, pty};
}

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

		const color = vscode.workspace.getConfiguration().get<string>('colorTerm.highlightColor') || 'red';
		const keywords = vscode.workspace.getConfiguration().get<string[]>('colorTerm.highlightKeywords') || [];
		const ptyOptions = createPtyOptions(keywords, color);	
		const terminal = (<any>vscode.window).createTerminal(ptyOptions);
		terminal.show();
	});
	context.subscriptions.push(disposable);

	const terminalProfile = vscode.window.registerTerminalProfileProvider( 'colorTerm.terminalProfile', {
		provideTerminalProfile: () => {
			const color = vscode.workspace.getConfiguration().get<string>('colorTerm.highlightColor') || 'red';
			const keywords = vscode.workspace.getConfiguration().get<string[]>('colorTerm.highlightKeywords') || [];
			const ptyOptions = createPtyOptions(keywords, color);	
			return new vscode.TerminalProfile(ptyOptions);
		},
	});
	context.subscriptions.push(terminalProfile);
}

// this method is called when your extension is deactivated
export function deactivate() {}
