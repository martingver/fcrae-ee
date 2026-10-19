// The approved symbol is the shared source for the club logo and supporter badge.
import {readFile,writeFile} from 'node:fs/promises';
const source=await readFile(new URL('../assets/rae-sk-symbol.svg',import.meta.url),'utf8');
const svg=(title,width,height,content)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">${title}</title>${content}</svg>`;
const groups=source.match(/<g[\s\S]*<\/g>/)[0].replace(/\s+(?:ns\d+|inkscape):[\w-]+="[^"]*"/g,'');
const symbol=(x,y,size,color='#FDEE08')=>`<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="300 150 450 450">${groups.replaceAll('#FDEE08',color)}</svg>`;
const word=(fill='#FFFFFF')=>`<text x="198" y="122" font-family="Arial Black, Arial, sans-serif" font-size="108" font-weight="900" fill="${fill}" textLength="446" lengthAdjust="spacingAndGlyphs">RAE SK</text>`;
for(const [name,fill,mark] of [['rae-sk-logo.svg','#FFFFFF','#FDEE08'],['rae-sk-logo-tume.svg','#111317','#111317']]){
 await writeFile(new URL('../assets/'+name,import.meta.url),svg('Rae SK jalgpall ja kogukond',660,180,symbol(0,0,180,mark)+word(fill)));
}
// Preserve the approved badge layout; its two symbol layers come from the same source.
let badge=await readFile(new URL('../assets/rae-sk-toetaja-jalgpall.svg',import.meta.url),'utf8');
const start=badge.indexOf('<g id="kogukond"');const end=badge.indexOf('<g id="pealkiri"');
if(start<0 || end<=start) throw new Error('Supporter badge symbol layers are missing');
badge=badge.slice(0,start)+groups+'\n'+badge.slice(end);
badge=badge.replace(/<desc[^>]*>[\s\S]*?<\/desc>/,'<desc id="description">Rae SK põhilogoga sama kogukonna ja jalgpalli sümbol. Muudetav tekst; Arial Black ja Arial.</desc>');
await writeFile(new URL('../assets/rae-sk-toetaja-jalgpall.svg',import.meta.url),badge);
await writeFile(new URL('../assets/rae-sk-favicon.svg',import.meta.url),svg('Rae SK',96,96,'<rect width="96" height="96" rx="18" fill="#111317"/>'+symbol(2,2,92)));
console.log('Club logo, light-background version, favicon and supporter SVG share the approved symbol.');
