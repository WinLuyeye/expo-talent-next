const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('lib/mfa-policy.ts','utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};
new Function('module','exports',compiled)(m,m.exports);
const {needsSecondFactor:gate}=m.exports;
for(const [label,current,verified,next,required,expected] of [
 ['rollout: existing unconfigured account allowed','aal1',false,'aal1',false,false],
 ['enrolled account cannot bypass MFA','aal1',true,'aal2',false,true],
 ['enrolled account blocked even when nextLevel is stale','aal1',true,'aal1',false,true],
 ['nextLevel requiring MFA is respected','aal1',false,'aal2',false,true],
 ['mandatory mode requires enrollment','aal1',false,'aal1',true,true],
 ['mandatory mode rejects stale AAL2 without factor','aal2',false,'aal1',true,true],
 ['verified AAL2 accepted','aal2',true,'aal2',true,false],
 ['verified AAL2 accepted during rollout','aal2',true,'aal2',false,false],
 ['missing level with verified factor blocks',null,true,'aal2',false,true],
]) test(label,()=>assert.equal(gate(current,verified,next,required),expected));
