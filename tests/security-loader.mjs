import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url);
export function loadTs(file,mocks={},cache=new Map()) {
 const absolute=resolve(file);
 if(cache.has(absolute))return cache.get(absolute);
 const exports={}; cache.set(absolute,exports);
 const source=readFileSync(absolute,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const require=name=>{
  if(Object.hasOwn(mocks,name))return mocks[name];
  if(name==='server-only')return {};
  if(name.startsWith('@/')||name.startsWith('.')) {
   const p=name.startsWith('@/')?resolve('src',name.slice(2)):resolve(dirname(absolute),name);
   const found=[p,p+'.ts',p+'.tsx'].find(existsSync);
   if(found){const alias="@/"+found.replace(resolve("src")+String.fromCharCode(92),"").replace(resolve("src")+"/","").replaceAll(String.fromCharCode(92),"/").replace(/\.tsx?$/,"");if(Object.hasOwn(mocks,alias))return mocks[alias];return loadTs(found,mocks,cache);}
  }
  return nativeRequire(name);
 };
 vm.runInNewContext(js,{exports,require,process,console,fetch:mocks.__fetch??fetch,Response,Request,Headers,File,FormData,Uint8Array,TextDecoder,TextEncoder,URL,URLSearchParams,AbortSignal,AbortController,Buffer,setTimeout,clearTimeout,crypto,ReadableStream},{filename:absolute});
 return exports;
}
