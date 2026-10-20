import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

test('public copy uses Rae SK and keeps implementation details out of visitor text', async()=>{
 const files=execFileSync('git',['ls-files','*.html','kalendrid/*.ics'],{encoding:'utf8'}).trim().split(/\r?\n/);
 files.push('app.js','api/forms/contact.mjs','scripts/update-jalgpall-data.mjs','llms.txt');
 for(const file of files){
  const text=await readFile(new URL('../'+file,import.meta.url),'utf8');
  // The registered legal name remains correct in consent and payment details.
  assert.doesNotMatch(text.replaceAll('FC Rae SK MTÜ',''),/FC Rae|FC RAE|Rae Sk/,file);
  assert.doesNotMatch(text,/jalgpall\.ee cache|käivita cache|fallback andmetest|cache'is piisavalt/,file);
  if(file.endsWith('.html')) {
   assert.doesNotMatch(text,/<!--(?:(?!-->)[\s\S])*?<!--/,`${file}: nested comments can expose disabled signup fields`);
   const activeMarkup=text.replace(/<!--[\s\S]*?-->/g,'');
   assert.doesNotMatch(activeMarkup,/fänn(?:i)?klub|fann(?:i)?klub/i,`${file}: fan club is not currently offered`);
   assert.doesNotMatch(text,/peasponsor/i,`${file}: supporters are presented equally`);
   const footer=text.match(/<footer\b[\s\S]*?<\/footer>/)?.[0]??'';
   assert.doesNotMatch(footer,/<strong>Rae SK<\/strong>/,`${file}: the footer logo already carries the brand name`);
  }
 }
});
