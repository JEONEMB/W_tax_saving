import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const result=spawnSync(resolve(root,process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python'),['-m','unittest','discover','-s','backend/tests','-v'],{cwd:root,stdio:'inherit',windowsHide:true});
if(result.error)console.error(result.error.message);process.exit(result.status??1);
