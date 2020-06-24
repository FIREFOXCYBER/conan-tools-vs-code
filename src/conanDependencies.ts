import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process';

export class ConanDependenciesProvider implements vscode.TreeDataProvider<ConanDependency>
{

    private _onDidChangeTreeData: vscode.EventEmitter<ConanDependency | undefined> = new vscode.EventEmitter<ConanDependency | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ConanDependency | undefined> = this._onDidChangeTreeData.event;
    conanToolsFolderPath: string;
    conanToolsInfoFilePath: string;
    
    
    setProfile(profile: string){
        this.profile = profile
    }
    getTreeItem(element: ConanDependency): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: ConanDependency): vscode.ProviderResult<ConanDependency[]> {
        let ret: ConanDependency[] | undefined = [];
        let children: string[] | undefined;
        if (element === undefined) {
            children = this.dependencies.get('ROOT');
        } else {
            children = this.dependencies.get(element.label);
        }
        return new Promise((resolve, rejected) => {
            if(children) {
                children.forEach(child => {
                    let childDependency: ConanDependency;
                    if(this.dependencies.has(child))
                    {
                        childDependency = new ConanDependency(child, vscode.TreeItemCollapsibleState.Collapsed);
                    }
                    else {
                        childDependency = new ConanDependency(child, vscode.TreeItemCollapsibleState.None);
                    }
                    if(ret) {
                        ret.push(childDependency);
                    }                    
                });
            }
            resolve(ret);
        });
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    constructor(private workspace: string | undefined, private profile: string | undefined, private dependencies: Map<string, string[]> = new Map()) {

        this.conanToolsFolderPath = workspace + '/.vscode/.conan_tools';
        this.conanToolsInfoFilePath = this.conanToolsFolderPath + '/conanInfo.dot';
        this.createConanInfo()
    }

    createConanInfo() {
        let command = 'conan info ' + this.workspace + '/ -g ' + this.conanToolsInfoFilePath;
        if(this.profile){
            command = command+' -pr ' + this.profile;
        }
        exec(command, (err, stdout, stderr) => {
            if (err) {
                vscode.window.showErrorMessage('Failed to grab conan information');
                exec('conan install .', { cwd: this.workspace, maxBuffer: 1024 * 4000 }, (err, stdout, stderr) => {
                    vscode.window.showErrorMessage('Conan Tools: Failed to get conan info');
                    fs.writeFileSync(this.conanToolsFolderPath + '/info.log', stdout.toString());

                    let infoLogUri = vscode.Uri.file(this.conanToolsFolderPath + '/info.log');
                    vscode.window.showTextDocument(infoLogUri);
                });
            }
            else {
                this.readConanInfo();
            }
        });
    }

    readConanInfo() {
        let dataBuffer = fs.readFileSync(this.conanToolsInfoFilePath);
        let fileContents = dataBuffer.toString();
        let lines = fileContents.split('\n');
        this.dependencies.clear();
        lines.forEach(line => {
            if (!(line.startsWith("}")) && !(line.startsWith('digraph'))) {
                let split = line.split("->");
                if (split.length > 0) {
                    let parentLabel = split[0];
                    parentLabel = parentLabel.replace("\"", "").trim();
                    parentLabel = parentLabel.replace(/"/g, '');
                    if (parentLabel.includes('@PROJECT') || parentLabel.includes('conanfile.py')) {
                        parentLabel = 'ROOT';
                    }
                    
                    let childrenConan: string[] = [];
                    let rootchildren = this.dependencies.get(parentLabel);
                    if(rootchildren)
                        childrenConan = rootchildren
                    let children = split[1];
                    if(children) {
                        children = children.replace('{', '');
                        children = children.replace('}', '');
                        children = children.replace(/"/g, '');
                        let cleanChildren = children.split(' ');
                        cleanChildren.forEach(cleanChild => {
                            if (cleanChild !== '' && cleanChild !== ' ') {
                                let childLabel = cleanChild.trim();
                                childrenConan.push(childLabel);
                            }
                        });
                        if(childrenConan.length > 0) {                      
                            this.dependencies.set(parentLabel, childrenConan);
                        }
                    }
                }
            }
        });
        this.refresh();
    }
}


class ConanDependency extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }

    get tooltip(): string {
        return `${this.label}`;
    }

}