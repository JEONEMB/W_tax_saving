import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const python=resolve(root,process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
const children=[];
function start(command,args){const child=spawn(command,args,{cwd:root,stdio:'inherit',windowsHide:true});children.push(child);child.on('error',error=>{console.error(error.message);stop(1)});child.on('exit',code=>{if(!stopping)stop(code||0)});return child}
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code}
if(existsSync(python))start(python,['-m','uvicorn','backend.app:app','--host','127.0.0.1','--port',process.env.WON_API_PORT||'8000']);
else console.warn('Python server is not installed. Using browser storage and rules. Run: npm run setup:server');
start(process.execPath,[resolve(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1',...process.argv.slice(2)]);
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
