import {mkdir,rm,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist');
// Only browser assets are published. Never copy backend files or .env files.
const files=['index.html','style.css','app.js','script-editor.js','creative-ui.js','creative-contract.js','assets/dunes.svg','assets/coast.svg','assets/arch.svg'];
await rm(out,{recursive:true,force:true});
await mkdir(path.join(out,'assets'),{recursive:true});
await Promise.all(files.map(file=>copyFile(path.join(root,file),path.join(out,file))));
console.log(`Built ${files.length} browser assets in dist/`);
