// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const path = require('path');
const yaml = require('js-yaml');


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

    const editor = vscode.window.activeTextEditor;
    const doc = editor.document;

    const panel = vscode.window.createWebviewPanel(
      'openapiPreview', // Identifies the type of the webview. Used internally
      "OpenAPI Preview", // Title of the panel displayed to the user
      vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'node_modules', 'swagger-ui-dist'))
        ]
      }
    );

    // And set its HTML content
    const jsOnDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', 'swagger-ui-dist', 'swagger-ui-bundle.js'));
    const cssOnDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', 'swagger-ui-dist', 'swagger-ui.css'));
    const jsSrc = jsOnDiskPath.with({scheme: 'vscode-resource'});
    const cssSrc = cssOnDiskPath.with({scheme: 'vscode-resource'});

    panel.webview.html = getWebviewContent({jsSrc, cssSrc});

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
  panel.webview.postMessage({
    type: 'update-spec',
    spec: JSON.stringify(yaml.load(doc.getText()))
  });
}

function getWebviewContent(path) {
  return `
  <!DOCTYPE html>
  <html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: vscode-resource:; script-src 'unsafe-inline' vscode-resource:; style-src 'unsafe-inline' vscode-resource:;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>OpenAPI Preview</title>
    <script src="${path.jsSrc}"></script>
    <link rel="stylesheet" type="text/css" href="${path.cssSrc}">
  </head>

  <body style="background-color: white;">
    <div id="swagger-ui"></div>
    <script>
      const vscode = acquireVsCodeApi();
      const ui = SwaggerUIBundle({
        dom_id: '#swagger-ui',
        spec: '{}',

        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ]

      });

      window.ui = ui;
      window.addEventListener('message', event => {
        if (event.data.type === 'update-spec') {
          ui.specActions.updateSpec(event.data.spec);
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

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
