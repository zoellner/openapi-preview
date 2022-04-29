"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const json_schema_ref_parser_1 = __importDefault(require("@apidevtools/json-schema-ref-parser"));
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "openapi-preview" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerCommand('openapiPreview.open', function () {
        // The code you place here will be executed every time your command is executed
        // const config = vscode.workspace.getConfiguration('openApiPreview');
        const doc = vscode.window.activeTextEditor?.document;
        const panel = vscode.window.createWebviewPanel('openapiPreview', // Identifies the type of the webview. Used internally
        "OpenAPI Preview", // Title of the panel displayed to the user
        vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
        getWebviewOptions(context.extensionUri));
        // And set its HTML content
        const elementsJsOnDiskPath = vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@stoplight', 'elements', 'web-components.min.js');
        const elementsCssOnDiskPath = vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@stoplight', 'elements', 'styles.min.css');
        const globalCssOnDiskPath = vscode.Uri.joinPath(context.extensionUri, 'css', 'global.css');
        const options = Object.assign({}, { elementsJsOnDiskPath, elementsCssOnDiskPath, globalCssOnDiskPath });
        panel.webview.html = getWebviewContent(panel.webview, options);
        panel.webview.onDidReceiveMessage(event => {
            if (event.type === 'ready') {
                updateSpec(panel, doc);
            }
        }, undefined, context.subscriptions);
        //change detection
        vscode.workspace.onDidSaveTextDocument(function (event) {
            if (doc?.fileName === event.fileName) {
                updateSpec(panel, doc);
            }
        });
    }));
}
exports.activate = activate;
function getWebviewOptions(extensionUri) {
    return {
        // Enable javascript in the webview
        enableScripts: true,
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'node_modules', '@stoplight'),
            vscode.Uri.joinPath(extensionUri, 'css')
        ]
    };
}
function updateSpec(panel, doc) {
    if (!doc) {
        return;
    }
    return json_schema_ref_parser_1.default.bundle(doc.fileName)
        .then((bundle) => {
        panel.webview.postMessage({
            type: 'update-spec',
            spec: JSON.stringify(bundle)
        });
    })
        .catch((err) => {
        console.error(err);
        throw err;
    });
}
function getWebviewContent(webview, options) {
    // And the uris we use to load the script and css in the webview
    const elementsJsUri = webview.asWebviewUri(options.elementsJsOnDiskPath);
    const elementsCssUri = webview.asWebviewUri(options.elementsCssOnDiskPath);
    const globalCssUri = webview.asWebviewUri(options.globalCssOnDiskPath);
    const inlineCssSha = 'sha256-UTjtaAWWTyzFjRKbltk24jHijlTbP20C1GUYaWPqg7E=';
    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();
    return `
  <!DOCTYPE html>
  <html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src '${inlineCssSha}' ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>OpenAPI Preview</title>
    <!-- Embed elements Elements via Web Component -->
    <script nonce="${nonce}" src="${elementsJsUri}"></script>
    <link rel="stylesheet" type="text/css" href="${elementsCssUri}">
    <link rel="stylesheet" type="text/css" href="${globalCssUri}">
  </head>

  <body>
    <elements-api id="docs" router="hash" layout="stacked" hideTryIt="true"/>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const docs = document.getElementById('docs');

      window.addEventListener('message', event => {
        if (event.data.type === 'update-spec') {
          docs.apiDescriptionDocument = event.data.spec;
        }
      });

      vscode.postMessage({
        type: 'ready'
      }, '*');
    </script>
  </body>

  </html>

  `;
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map