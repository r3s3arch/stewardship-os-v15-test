'use strict';
const $=id=>document.getElementById(id);let manifest,book,selected=null;let originTrail=null;const bookCache=new Map();const KEY='stewardship-v15-preview-annotations';const DB_NAME='stewardship-living-word-v15';let saved={};let db=null;let writeQueue=Promise.resolve();let dirty=false;
try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{saved={}}
function setSaveStatus(message,error=false){const el=$('save-status');if(el){el.textContent=message;el.classList.toggle('save-error',error)}}
function openDB(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(Error('IndexedDB unavailable'));return}const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records')};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
function idbGet(){return new Promise((resolve,reject)=>{const t=db.transaction('records','readonly');const r=t.objectStore('records').get('annotations');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function idbPut(data){return new Promise((resolve,reject)=>{const t=db.transaction('records','readwrite');t.objectStore('records').put(data,'annotations');t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)})}
async function initializeStorage(){setSaveStatus('Opening saved study library…');try{db=await openDB();const stored=await idbGet();if(stored&&typeof stored==='object'){saved={...saved,...stored};}await idbPut(saved);setSaveStatus('Study library ready · saved on this device')}catch(e){db=null;setSaveStatus('Local backup only · export your study data',true)}}
function persist(){dirty=true;const snapshot=JSON.parse(JSON.stringify(saved));setSaveStatus('Saving…');writeQueue=writeQueue.catch(()=>{}).then(async()=>{let success=false;if(db){await idbPut(snapshot);success=true}try{localStorage.setItem(KEY,JSON.stringify(snapshot));success=true}catch(e){}if(!success)throw Error('Browser storage unavailable');dirty=false;setSaveStatus('Saved on this device ✓')}).catch(e=>{setSaveStatus('Save failed — export your study data',true);alert('Your change could not be saved. Please export a backup before leaving this page. '+e.message)});return writeQueue}
function refreshStudy(v){selected=null;render();toggle(v)}
function exportData(){const payload={format:'stewardship-living-word-study',version:1,exportedAt:new Date().toISOString(),annotations:saved};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='the-living-word-study-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importData(file){const payload=JSON.parse(await file.text());if(payload.format!=='stewardship-living-word-study'||!payload.annotations||typeof payload.annotations!=='object'||Array.isArray(payload.annotations))throw Error('Not a valid Living Word backup');if(!confirm('Restore backup? Existing records with the same verse reference will be replaced.'))return;saved={...saved,...payload.annotations};await persist();render();setSaveStatus('Backup restored ✓')}
function ref(v){return `${book.code}.${$('chapter').value}.${v}`}
function state(k){return saved[k]||(saved[k]={notes:[],highlight:false,connections:[]})}
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function opt(sel,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;sel.append(o)}
async function loadBook(code,chapter){const r=await fetch('books/'+encodeURIComponent(code)+'.json');if(!r.ok)throw Error('Unable to load book');book=await r.json();bookCache.set(code,book);$('chapter').replaceChildren();Object.keys(book.chapters).forEach(c=>opt($('chapter'),c,c));$('chapter').value=chapter&&book.chapters[chapter]?chapter:Object.keys(book.chapters)[0];render()}
function fillBooks(code){const group=$('group').value;$('book').replaceChildren();manifest.books.filter(b=>b.group===group).forEach(b=>opt($('book'),b.code,b.name));if(code&&[...$('book').options].some(o=>o.value===code))$('book').value=code}
function render(){selected=null;$('title').textContent=book.name+' '+$('chapter').value;const vs=book.chapters[$('chapter').value]||[];$('status').textContent=`${vs.length} source verse entries · ${book.group}`;$('verses').replaceChildren();vs.forEach(v=>{const k=ref(v.v),st=state(k);const row=node('div','verse'+(st.highlight?' highlighted':''));row.id='verse-'+v.v;const num=node('span','number',v.v);const content=node('span','vtext',v.t);content.tabIndex=0;content.setAttribute('role','button');content.setAttribute('aria-label','Study '+book.name+' '+$('chapter').value+':'+v.v);content.onclick=()=>toggle(v.v);content.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(v.v)}};row.append(num,content);if(st.notes.length)row.append(node('span','noteicon','✎ '+st.notes.length));$('verses').append(row);if(selected===v.v)row.classList.add('selected')})}
function normalizeReference(raw){
 const text=String(raw||'').trim().replace(/[–—]/g,'-').replace(/\s+/g,' ');
 const match=/^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?$/.exec(text);
 if(!match)return null;
 const b=manifest.books.find(x=>x.name.toLowerCase()===match[1].toLowerCase());
 if(!b)return null;
 const chapter=Number(match[2]),start=Number(match[3]),endChapter=match[4]?Number(match[4]):chapter,end=match[5]?Number(match[5]):start;
 if(chapter<1||chapter>b.chapters||endChapter!==chapter||start<1||end<start||end-start>49)return null;
 return {book:b,chapter,start,end,label:`${b.name} ${chapter}:${start}${end>start?'–'+end:''}`,key:`${b.code}.${chapter}.${start}-${end}`};
}
async function getBook(code){if(bookCache.has(code))return bookCache.get(code);const response=await fetch('books/'+encodeURIComponent(code)+'.json');if(!response.ok)throw Error('Passage not available');const data=await response.json();bookCache.set(code,data);return data}
async function showPreview(container,reference){container.replaceChildren(node('p','small','Loading passage…'));try{const data=await getBook(reference.book.code);const verses=data.chapters[String(reference.chapter)]||[];const matched=verses.filter(x=>{const n=Number(x.v);return Number.isInteger(n)&&n>=reference.start&&n<=reference.end});if(!matched.length||!verses.some(x=>Number(x.v)===reference.start)||!verses.some(x=>Number(x.v)===reference.end))throw Error('Verse range is not present in this source');container.replaceChildren();matched.forEach(x=>container.append(node('p','previewverse',`${x.v}  ${x.t||'[No main verse text in source]'}`)))}catch(e){container.replaceChildren(node('p','small','Unable to preview: '+e.message))}}
async function openInContext(reference,fromVerse){originTrail={book:book.code,chapter:$('chapter').value,verse:fromVerse};$('group').value=reference.book.group;fillBooks(reference.book.code);await loadBook(reference.book.code,String(reference.chapter));const target=$('verse-'+reference.start);if(target){target.scrollIntoView({block:'center'});toggle(String(reference.start))}showReturn()}
function showReturn(){let back=$('return-origin');if(!originTrail){back?.remove();return}if(!back){back=node('button','return-origin');back.id='return-origin';$('verses').before(back)}back.textContent='← Return to '+(manifest.books.find(b=>b.code===originTrail.book)?.name||'Scripture')+' '+originTrail.chapter+':'+originTrail.verse;back.onclick=async()=>{const original=originTrail;originTrail=null;$('group').value=manifest.books.find(b=>b.code===original.book).group;fillBooks(original.book);await loadBook(original.book,original.chapter);showReturn();const target=$('verse-'+original.verse);if(target){target.scrollIntoView({block:'center'});toggle(String(original.verse))}}}
function toggle(v){if(selected===v){selected=null;render();return}selected=v;render();selected=v;const row=$('verse-'+v);row.classList.add('selected');const k=ref(v),st=state(k);const panel=node('div','tools');panel.append(node('h2','',`Study · ${book.name} ${$('chapter').value}:${v}`));const bar=node('div','toolrow');const highlight=node('button','',st.highlight?'Remove highlight':'Highlight verse');highlight.onclick=()=>{st.highlight=!st.highlight;persist();refreshStudy(v)};const bookmark=node('button','','Save to My Walk (planned)');bookmark.disabled=true;const close=node('button','','Return to reading');close.onclick=()=>{selected=null;render()};bar.append(highlight,bookmark,close);panel.append(bar);const noteTitle=node('label','','Your saved notes');panel.append(noteTitle);if(!st.notes.length)panel.append(node('p','small','No notes saved yet.'));st.notes.forEach((n,i)=>{
  const box=node('div','savednote');
  const content=node('div','savednote-text',n.text);
  content.tabIndex=0;content.setAttribute('role','button');content.setAttribute('aria-label','Edit saved note');
  content.title='Click to edit this note';
  const actions=node('div','note-actions');
  function beginEdit(){
    if(box.classList.contains('editing'))return;
    box.classList.add('editing');
    const editor=node('textarea','note-editor');editor.value=n.text;editor.rows=Math.max(3,Math.min(9,n.text.split('\n').length+2));
    content.replaceWith(editor);actions.replaceChildren();
    const save=node('button','note-action','Save');
    const cancel=node('button','note-action','Cancel');
    const del=node('button','note-action','Delete');
    save.onclick=()=>{const revised=editor.value.trim();if(!revised){alert('A note cannot be empty. Use Delete to remove it.');return}n.text=revised;n.updatedAt=new Date().toISOString();persist();refreshStudy(v)};
    cancel.onclick=()=>{refreshStudy(v)};
    del.onclick=()=>{if(confirm('Delete this note?')){st.notes.splice(i,1);persist();refreshStudy(v)}};
    actions.append(save,cancel,del);editor.focus();
  }
  content.onclick=beginEdit;
  content.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();beginEdit()}};
  box.append(content,actions);panel.append(box);
});const label=node('label','','Add a note');const textarea=node('textarea');textarea.rows=3;textarea.placeholder='Record your thought, prayer, or observation…';const add=node('button','','Save note');add.onclick=()=>{const t=textarea.value.trim();if(!t)return;st.notes.push({text:t,at:new Date().toISOString()});persist();refreshStudy(v)};panel.append(label,textarea,add);if((book.chapters[$('chapter').value]||[]).find(x=>x.v===v)?.notes.length){panel.append(node('label','','Source textual notes'));const notes=(book.chapters[$('chapter').value]||[]).find(x=>x.v===v).notes;notes.forEach(n=>panel.append(node('div','footnotes',n)))}const cross=node('label','','My Connections');panel.append(cross);
 const connectionList=node('div','connection-list');panel.append(connectionList);
 function displayConnections(){connectionList.replaceChildren();if(!st.connections.length)connectionList.append(node('p','small','No personal connections saved yet.'));
 st.connections.forEach((entry,i)=>{
 const raw=typeof entry==='string'?entry:entry.ref;const parsed=normalizeReference(raw);
 const wrap=node('div','connection-item');const head=node('button','connection-head',parsed?.label||raw);head.setAttribute('aria-expanded','false');wrap.append(head);
 const detail=node('div','connection-detail');detail.hidden=true;const preview=node('div','connection-preview');detail.append(preview);
 if(parsed){const actions=node('div','connection-actions');const context=node('button','note-action','Open in context');context.onclick=()=>openInContext(parsed,v).catch(e=>alert(e.message));actions.append(context);detail.append(actions)}else{detail.append(node('p','small','This reference cannot be previewed. Remove it and add a valid book, chapter, and verse.'))}
 const remove=node('button','note-action','Remove');remove.onclick=()=>{if(!confirm('Remove this connection?'))return;st.connections.splice(i,1);persist();displayConnections()};
 const foot=node('div','connection-actions');foot.append(remove);detail.append(foot);wrap.append(detail);head.onclick=()=>{const opening=detail.hidden;connectionList.querySelectorAll('.connection-detail').forEach(el=>el.hidden=true);connectionList.querySelectorAll('.connection-head').forEach(el=>el.setAttribute('aria-expanded','false'));detail.hidden=!opening;head.setAttribute('aria-expanded',String(opening));if(opening&&parsed)showPreview(preview,parsed)};connectionList.append(wrap)
 })}displayConnections();
 const entryLabel=node('label','','Add another connection');panel.append(entryLabel);
 const picker=node('div','connection-picker');const groupSelect=node('select');const bookSelect=node('select');const chapterSelect=node('select');const fromSelect=node('select');const toSelect=node('select');
 groupSelect.setAttribute('aria-label','Connection collection');bookSelect.setAttribute('aria-label','Connection book');chapterSelect.setAttribute('aria-label','Connection chapter');fromSelect.setAttribute('aria-label','First verse');toSelect.setAttribute('aria-label','Last verse');
 ['Old Testament','Deuterocanonical Books','New Testament'].forEach(g=>opt(groupSelect,g,g));groupSelect.value=book.group;
 function updateBooks(){bookSelect.replaceChildren();manifest.books.filter(b=>b.group===groupSelect.value).forEach(b=>opt(bookSelect,b.code,b.name));updateChapters()}
 function updateChapters(){chapterSelect.replaceChildren();const found=manifest.books.find(b=>b.code===bookSelect.value);if(found)for(let i=1;i<=found.chapters;i++)opt(chapterSelect,String(i),String(i));updateVerses()}
 async function updateVerses(){fromSelect.replaceChildren();toSelect.replaceChildren();const code=bookSelect.value,chapter=chapterSelect.value;if(!code||!chapter)return;try{const data=await getBook(code);if(code!==bookSelect.value||chapter!==chapterSelect.value)return;const verses=(data.chapters[chapter]||[]).map(x=>Number(x.v)).filter(Number.isInteger);const unique=[...new Set(verses)].sort((a,b)=>a-b);unique.forEach(n=>{opt(fromSelect,String(n),String(n));opt(toSelect,String(n),String(n))});toSelect.value=fromSelect.value}catch(e){opt(fromSelect,'','Unavailable');opt(toSelect,'','Unavailable')}}
 groupSelect.onchange=updateBooks;bookSelect.onchange=updateChapters;chapterSelect.onchange=updateVerses;bookSelect.value=book.code;updateChapters();
 picker.append(bookSelect,chapterSelect,fromSelect,toSelect);panel.append(picker);groupSelect.hidden=true;const allBooks=manifest.books;bookSelect.replaceChildren();allBooks.forEach(b=>opt(bookSelect,b.code,b.name));bookSelect.value=book.code;updateChapters();bookSelect.onchange=updateChapters;fromSelect.onchange=()=>{toSelect.replaceChildren();const options=[...fromSelect.options].filter(o=>Number(o.value)>=Number(fromSelect.value));options.forEach(o=>opt(toSelect,o.value,o.textContent));toSelect.value=fromSelect.value};
 
 const link=node('button','','Save connection');link.onclick=async()=>{const raw=`${manifest.books.find(b=>b.code===bookSelect.value)?.name} ${chapterSelect.value}:${fromSelect.value}${toSelect.value!==fromSelect.value?'–'+toSelect.value:''}`;const parsed=normalizeReference(raw);if(!parsed){alert('Enter a valid reference in one chapter, such as Colossians 2:6–7.');return}try{const data=await getBook(parsed.book.code);const verses=data.chapters[String(parsed.chapter)]||[];if(!verses.some(x=>Number(x.v)===parsed.start)||!verses.some(x=>Number(x.v)===parsed.end))throw Error('That verse range is unavailable in this source');if(st.connections.some(c=>normalizeReference(typeof c==='string'?c:c.ref)?.key===parsed.key)){alert('This connection is already saved.');return}st.connections.push(parsed.label);persist();displayConnections()}catch(e){alert(e.message)}};
 panel.append(link,node('p','small','Suggested cross-references will be added after a verified reference dataset is available.'));row.after(panel)}
// Navigation uses the complete manifest, not the currently selected collection.
// Both chapter and verse controls update collection/book/chapter selectors on crossings.
async function moveAcrossBooks(delta, verseMode){
 const books=manifest.books;
 let index=books.findIndex(item=>item.code===book.code)+Math.sign(delta);
 while(index>=0&&index<books.length){
  const target=books[index];
  const data=await getBook(target.code);
  const chapters=Object.keys(data.chapters).filter(c=>(data.chapters[c]||[]).length);
  if(chapters.length){
   const chapter=delta>0?chapters[0]:chapters[chapters.length-1];
   $('group').value=target.group;
   fillBooks(target.code);
   await loadBook(target.code,chapter);
   if(verseMode){
    const verses=data.chapters[chapter];
    const verse=String((delta>0?verses[0]:verses[verses.length-1]).v);
    refreshStudy(verse);
    $('verse-'+verse)?.scrollIntoView({block:'center',behavior:'smooth'});
   }else window.scrollTo({top:0,behavior:'smooth'});
   return;
  }
  index+=Math.sign(delta);
 }
}
async function navigateVerse(delta){
 if(!book)return;
 const chapter=$('chapter').value;
 const verses=(book.chapters[chapter]||[]).map(x=>String(x.v));
 const index=selected===null?(delta>0?-1:verses.length):verses.indexOf(String(selected));
 const target=index+delta;
 if(target>=0&&target<verses.length){
  refreshStudy(verses[target]);
  $('verse-'+verses[target])?.scrollIntoView({block:'center',behavior:'smooth'});
  return;
 }
 const chapters=Object.keys(book.chapters).filter(c=>(book.chapters[c]||[]).length);
 const ci=chapters.indexOf(chapter)+Math.sign(delta);
 if(ci>=0&&ci<chapters.length){
  $('chapter').value=chapters[ci];
  const next=book.chapters[chapters[ci]];
  const v=String((delta>0?next[0]:next[next.length-1]).v);
  refreshStudy(v);
  $('verse-'+v)?.scrollIntoView({block:'center',behavior:'smooth'});
  return;
 }
 await moveAcrossBooks(delta,true);
}
async function navigate(delta){
 if(!book)return;
 const chapters=Object.keys(book.chapters).filter(c=>(book.chapters[c]||[]).length);
 const index=chapters.indexOf($('chapter').value)+delta;
 if(index>=0&&index<chapters.length){
  $('chapter').value=chapters[index];render();
  window.scrollTo({top:0,behavior:'smooth'});
  return;
 }
 await moveAcrossBooks(delta,false);
}
async function init(){try{await initializeStorage();$('export-study').onclick=exportData;$('import-study').onchange=async e=>{if(e.target.files[0])try{await importData(e.target.files[0])}catch(err){alert(err.message)}e.target.value=''};$('prev-verse').onclick=()=>navigateVerse(-1).catch(fail);$('next-verse').onclick=()=>navigateVerse(1).catch(fail);const r=await fetch('manifest.json');if(!r.ok)throw Error('Missing manifest');manifest=await r.json();const groups=['Old Testament','Deuterocanonical Books','New Testament'];groups.forEach(g=>opt($('group'),g,g));$('group').value='New Testament';fillBooks('JHN');$('group').onchange=()=>{fillBooks();loadBook($('book').value).catch(fail)};$('book').onchange=()=>loadBook($('book').value).catch(fail);$('chapter').onchange=render;$('prev').onclick=()=>navigate(-1).catch(fail);$('next').onclick=()=>navigate(1).catch(fail);await loadBook('JHN','15')}catch(e){fail(e)}}
function fail(e){$('status').textContent='Reader error: '+e.message+' — Serve this folder with a local web server or deploy it to a static host.'}
init();
