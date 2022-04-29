// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const path = require('path');
const refParser = require('json-schema-ref-parser');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "openapi-preview" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('extension.preview', function () {
    // The code you place here will be executed every time your command is executed
    const config = vscode.workspace.getConfiguration('openApiPreview');
    const editor = vscode.window.activeTextEditor;
    const doc = editor.document;

    const panel = vscode.window.createWebviewPanel(
      'openapiPreview', // Identifies the type of the webview. Used internally
      "OpenAPI Preview", // Title of the panel displayed to the user
      vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'node_modules', '@stoplight')),
          vscode.Uri.file(path.join(context.extensionPath, 'css'))
        ]
      }
    );

    // And set its HTML content
    const elementsJsOnDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', '@stoplight', 'elements', 'web-components.min.js'));
    const elementsCssOnDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', '@stoplight', 'elements', 'styles.min.css'));

    const globalCssOnDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'css', 'global.css'));
    const options = Object.assign({}, config, {elementsJsOnDiskPath, elementsCssOnDiskPath, globalCssOnDiskPath});

    panel.webview.html = getWebviewContent(panel.webview, options);

    panel.webview.onDidReceiveMessage(event => {
      if (event.type === 'ready') {
        updateSpec(panel, doc);
      }
    }, undefined, disposable);

    //change detection
    vscode.workspace.onDidSaveTextDocument(function(event) {
      if (doc.fileName === event.fileName) {
        updateSpec(panel, doc);
      }
    });
  });

  context.subscriptions.push(disposable);
}
exports.activate = activate;

function updateSpec(panel, doc) {
  return refParser.bundle(doc.fileName)
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

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
