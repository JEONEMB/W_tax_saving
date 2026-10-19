import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const requirements=existsSync(resolve(root,'backend/requirements.lock'))?'backend/requirements.lock':'backend/requirements.txt';
const python=resolve(root,process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
const commands=[];
if(!existsSync(python))commands.push([process.platform==='win32'?'python':'python3',['-m','venv','.venv']]);
commands.push([python,['-m','pip','install','-r',requirements]]);
for(const [command,args] of commands){
 const result=spawnSync(command,args,{cwd:root,stdio:'inherit',windowsHide:true});if(result.error||result.status!==0){console.error(result.error?.message||'Server setup failed');process.exit(result.status||1)}
}
