'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
// import * as path from 'path';


import { ConanDependenciesProvider } from './conanDependencies';
import { exec } from 'child_process';
import { ProgressLocation } from 'vscode';

let rootPath:string | undefined;
let buildPath:string;
let conanToolsFolderPath:string;

let myStatusBarItem: vscode.StatusBarItem;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate({ subscriptions }: vscode.ExtensionContext) {

    rootPath = vscode.workspace.rootPath;
    buildPath = rootPath + '/build';
    let vscodepath = rootPath + '/.vscode';
    conanToolsFolderPath = rootPath + '/.vscode/.conan_tools';

    if(!fs.existsSync(vscodepath)) {
        fs.mkdirSync(vscodepath);
    }
    if(!fs.existsSync(conanToolsFolderPath)){
        fs.mkdirSync(conanToolsFolderPath);
    }
    let profiles = <Array<string>>vscode.workspace.getConfiguration().get('conan.profiles');
    let profile = profiles[0];
    const conanDependencyProvider = new ConanDependenciesProvider(rootPath,profile);
    vscode.window.registerTreeDataProvider('conan.configure', conanDependencyProvider);

    // register a command that is invoked when the status bar
	// item is selected
    const myCommandId = 'sample.showSelectionCount';
    
	subscriptions.push(vscode.commands.registerCommand(myCommandId, () => {
        let options = <vscode.QuickPickOptions>{  
            placeHolder: 'Type a line number or a piece of code to navigate to',
            matchOnDescription: true,
            onDidSelectItem: item => {
                if(item){
                    profile = item.toString();
                    myStatusBarItem.text = profile;
                    conanDependencyProvider.setProfile(profile)
                    conanDependencyProvider.createConanInfo();
                    myStatusBarItem.show();
                }
            }
          };
        vscode.window.showQuickPick(profiles,options)
	}));
    
	// create a new status bar item that we can now manage
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = myCommandId;
    myStatusBarItem.text = profile
    conanDependencyProvider.setProfile(profile)
    myStatusBarItem.show();
    subscriptions.push(myStatusBarItem);
    
    
    vscode.commands.registerCommand('conan.install', () => {
        
        vscode.window.withProgress({
            location:ProgressLocation.Notification,
            title: "Conan Tools"
        }, (progress, token) => {
            let p = new Promise(resolve => {
                progress.report({message: 'Installing conan dependencies' });
                setImmediate(() => {
                    
                    // Create build directory if non existent
                    if(!fs.existsSync(buildPath))
                    {
                        fs.mkdirSync(vscode.workspace.rootPath + '/build/');
                    }

                    

                    let conanInstallCommand = 
                        String(vscode.workspace.getConfiguration().get('conan.installCommand'));
                    if(conanInstallCommand) {
                        if(profile){
                            var re = /{pr}/gi; 
                            var str = conanInstallCommand;
                            conanInstallCommand = str.replace(re, profile); 
                        }
                        exec(conanInstallCommand, {cwd: buildPath, maxBuffer: 1024 * 4000}, (err, stdout, stderr) => {
                            if(err)
                            {
                                progress.report({message: 'Install Failed'});
                                vscode.window.showErrorMessage('Install Failed');
    
                                vscode.window.showErrorMessage('Conan Tools: Installing dependencies failed');
                                fs.writeFileSync(conanToolsFolderPath + '/install.log', stdout.toString());
                                
                                let installLogUri = vscode.Uri.file(conanToolsFolderPath + '/install.log');
                                vscode.window.showTextDocument(installLogUri);
    
                            } else {
                                conanDependencyProvider.createConanInfo();
                                vscode.window.showInformationMessage('Conan Tools: Installed conan dependencies');
                            }
                            resolve();
                        });
                    }
                    
                });
            });
            return p;
        });
        

    });

    vscode.commands.registerCommand('conan.build', () => {
        
        vscode.window.withProgress({
            location:ProgressLocation.Notification,
            title: 'Conan Tools'   
        }, (progress, token) => {
            progress.report({message: 'Building' });
            let p = new Promise(resolve => {
                setImmediate(() => {

                    if(!fs.existsSync(buildPath))
                    {
                        fs.mkdirSync(vscode.workspace.rootPath + '/build/');
                    }
                    
                    let conanBuildCommand = vscode.workspace.getConfiguration().get('conan.buildCommand');
                    if(conanBuildCommand) {
                        exec(conanBuildCommand.toString(), {cwd: buildPath, maxBuffer: 1024 * 4000}, (err, stdout, stderr) => {
                            if(err){
                                progress.report({message: 'Build Failed'});      
                                vscode.window.showErrorMessage('Conan Tools: Build failed');
                                fs.writeFileSync(conanToolsFolderPath + '/build.log', stdout.toString());
                                
                                let buildLogUri = vscode.Uri.file(conanToolsFolderPath + '/build.log');
                                vscode.window.showTextDocument(buildLogUri, {viewColumn: vscode.ViewColumn.Beside});
                            } else {
                                progress.report({message: 'Build completed'});
                                vscode.window.showInformationMessage('Conan Tools: Build succeeded');
                            }
                            resolve();
                        });
                    }
                });
            });
            return p;
        });
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
}