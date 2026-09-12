/* Football Draft v2 - ①条件強化 ②候補戦略化 ③ケミストリー強化 ④ドラフト中アドバイス */

let players=[], drafted=[], usedPlayerIds=new Set(), usedConditionKeys=new Set();
let skips=3, draftCount=0, formation="4-3-3", currentCondition=null;
const $=id=>document.getElementById(id);

const formations={
 "4-3-3":[["GK",1],["DF",4],["MF",3],["FW",3]],
 "4-4-2":[["GK",1],["DF",4],["MF",4],["FW",2]],
 "4-2-3-1":[["GK",1],["DF",4],["MF",5],["FW",1]],
 "3-5-2":[["GK",1],["DF",3],["MF",5],["FW",2]],
 "3-4-3":[["GK",1],["DF",3],["MF",4],["FW",3]],
 "4-1-4-1":[["GK",1],["DF",4],["MF",5],["FW",1]]
};
const statKeys=["pac","sho","pas","dri","def","phy"];

function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}

function normalizeTeam(team){
 const t=String(team||"").trim().toLowerCase();
 const map={"fc barcelona":"barcelona","barcelona":"barcelona","real madrid cf":"real madrid",
 "real madrid":"real madrid","manchester united fc":"manchester united","manchester united":"manchester united",
 "manchester city fc":"manchester city","manchester city":"manchester city","fc bayern munich":"bayern munich",
 "bayern munich":"bayern munich","inter milan":"inter","internazionale":"inter"};
 return map[t]||t;
}

function parseCSV(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i],n=text[i+1];
  if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}
  if(c==='"'){quoted=!quoted;continue}
  if(c===","&&!quoted){row.push(cell);cell="";continue}
  if((c==="\n"||c==="\r")&&!quoted){
   if(c==="\r"&&n==="\n")i++;
   row.push(cell);cell="";
   if(row.some(x=>x.trim()!==""))rows.push(row);row=[];continue
  }
  cell+=c;
 }
 row.push(cell);if(row.some(x=>x.trim()!==""))rows.push(row);
 const headers=rows.shift().map(h=>h.trim());
 return rows.map(r=>{const o={};headers.forEach((h,i)=>o[h]=(r[i]??"").trim());return o});
}

function convertPlayer(p){
 return {...p,year:parseInt(p.year,10),pac:num(p.pac),sho:num(p.sho),pas:num(p.pas),
 dri:num(p.dri),def:num(p.def),phy:num(p.phy),titleBonus:num(p.titleBonus),awardBonus:num(p.awardBonus)}
}

async function loadPlayers(){
 try{
  const res=await fetch("players.csv?cache="+Date.now());if(!res.ok)throw Error("HTTP "+res.status);
  players=parseCSV(await res.text()).map(convertPlayer);
  if(players.length<100)throw Error("人数不足: "+players.length);
  console.log(`Football Draft: ${players.length} players loaded`);
 }catch(e){console.error(e);alert("players.csvを読み込めませんでした。GitHub Pages上で開いているか確認してね。")}
}

/* ---------- OVR ---------- */
const positionWeights={
 GK:{pac:.05,sho:.05,pas:.15,dri:.05,def:.30,phy:.40},
 DF:{pac:.15,sho:.05,pas:.15,dri:.10,def:.35,phy:.20},
 MF:{pac:.15,sho:.10,pas:.30,dri:.25,def:.10,phy:.10},
 FW:{pac:.25,sho:.30,pas:.15,dri:.25,def:.01,phy:.04}
};
function baseOVR(p){return Math.round(statKeys.reduce((s,k)=>s+num(p[k]),0)/6)}
function positionOVR(p,pos){
 const w=positionWeights[pos]||positionWeights.FW;
 return Math.round(statKeys.reduce((s,k)=>s+num(p[k])*(w[k]||0),0))
}
function positionCompatibility(p,pos){
 const n=String(p.naturalPosition||p.position||"").toUpperCase();
 if(n===pos)return 1;
 const flex={GK:[],DF:["MF"],MF:["DF","FW"],FW:["MF"]};
 if((flex[pos]||[]).includes(n))return .90;
 return .78;
}
function finalOVR(p,pos){
 return Math.min(100,Math.round(positionOVR(p,pos)*positionCompatibility(p,pos)+p.titleBonus*.7+p.awardBonus*.8))
}
function bestPosition(p){return ["GK","DF","MF","FW"].sort((a,b)=>finalOVR(p,b)-finalOVR(p,a))[0]}

/* ---------- ① Dynamic historical conditions ---------- */
function conditionKey(p){return [p.source,p.year,normalizeTeam(p.team),p.tournament||""].join("|")}
function buildConditions(){
 const map=new Map();
 players.forEach(p=>{
  const key=conditionKey(p);
  if(!map.has(key))map.set(key,{key,source:p.source,year:p.year,team:p.team,tournament:p.tournament||"",players:[]});
  map.get(key).players.push(p);
 });
 return [...map.values()];
}
function conditionLabel(c){
 return c.source==="NATIONAL"
  ? `${c.year} ${c.team}${c.tournament?" — "+c.tournament:""}`
  : `${c.year} ${c.team}`;
}
function pickCondition(){
 const all=buildConditions();
 let available=all.filter(c=>!usedConditionKeys.has(c.key)&&c.players.some(p=>!usedPlayerIds.has(p.id)));
 if(!available.length){
  usedConditionKeys.clear();
  available=all.filter(c=>c.players.some(p=>!usedPlayerIds.has(p.id)));
 }
 const rich=available.filter(c=>c.players.filter(p=>!usedPlayerIds.has(p.id)).length>=3);
 const pool=rich.length?rich:available;
 if(!pool.length)return null;
 const clubs=pool.filter(c=>c.source==="CLUB"), nations=pool.filter(c=>c.source==="NATIONAL");
 let selected=pool;
 if(Math.random()<.5&&clubs.length)selected=clubs;
 else if(nations.length)selected=nations;
 const c=selected[Math.floor(Math.random()*selected.length)];
 usedConditionKeys.add(c.key);return c;
}

/* ---------- ② Strategic candidate generation ---------- */
function neededPositions(){
 const slots=formations[formation]||formations["4-3-3"],current={};
 drafted.forEach(p=>{const bp=bestPosition(p);current[bp]=(current[bp]||0)+1});
 const need=[];
 slots.forEach(([pos,count])=>{for(let i=0;i<Math.max(0,count-(current[pos]||0));i++)need.push(pos)});
 return need;
}
function updateNeededPosition(){
 const n=neededPositions();
 if($("neededPosition"))$("neededPosition").textContent=n.length?n[0]:"自由枠";
}
function chemistryScore(team){
 if(team.length<=1)return 0;let score=0;
 const nations={},clubs={},contexts={};
 team.forEach(p=>{
  nations[p.nationality]=(nations[p.nationality]||0)+1;
  const c=normalizeTeam(p.team);clubs[c]=(clubs[c]||0)+1;
  const x=c+"|"+p.year;contexts[x]=(contexts[x]||0)+1;
 });
 Object.values(nations).forEach(n=>{if(n>=2)score+=Math.min(8,(n-1)*2)});
 Object.values(clubs).forEach(n=>{if(n>=2)score+=Math.min(8,(n-1)*2)});
 Object.values(contexts).forEach(n=>{if(n>=2)score+=Math.min(10,(n-1)*3)});
 return Math.min(30,score);
}
const comboDefs=[
 {names:["Lionel Messi","Xavi","Andrés Iniesta"],bonus:10,label:"🔥 Barcelona 黄金トリオ"},
 {names:["Lionel Messi","Neymar","Luis Suárez"],bonus:10,label:"🔥 MSN"},
 {names:["Cristiano Ronaldo","Karim Benzema","Luka Modrić"],bonus:10,label:"🔥 Madrid 黄金トリオ"},
 {names:["Xavi","Andrés Iniesta","Sergio Busquets"],bonus:9,label:"🔥 Barcelona 中盤トリオ"},
 {names:["Paolo Maldini","Andrea Pirlo","Gennaro Gattuso"],bonus:8,label:"🔥 Milan 黄金期"},
 {names:["Kaká","Ronaldo","Roberto Carlos"],bonus:7,label:"🔥 Brazil / Madrid"},
 {names:["Thierry Henry","Patrick Vieira","Robert Pirès"],bonus:7,label:"🔥 Arsenal 黄金期"},
 {names:["Zinedine Zidane","Ronaldo","Roberto Carlos"],bonus:7,label:"🔥 Galácticos"},
 {names:["Ronaldinho","Samuel Eto'o","Deco"],bonus:6,label:"🔥 Barcelona 2000s"}
];
function comboScore(team){
 let total=0,labels=[],progress=[];
 comboDefs.forEach(c=>{
  const count=c.names.filter(name=>team.some(p=>p.name.toLowerCase()===name.toLowerCase())).length;
  if(count===c.names.length){total+=c.bonus;labels.push(`${c.label} +${c.bonus}`)}
  else if(count>=2)progress.push(`${c.label} ${count}/${c.names.length}`);
 });
 return {total:Math.min(30,total),labels,progress};
}
function candidateNeedScore(p){
 const need=neededPositions()[0],fit=need?positionCompatibility(p,need):1;
 let chem=0;
 drafted.forEach(x=>{
  if(x.nationality===p.nationality)chem+=2;
  if(normalizeTeam(x.team)===normalizeTeam(p.team))chem+=2;
  if(x.year===p.year&&normalizeTeam(x.team)===normalizeTeam(p.team))chem+=2;
 });
 return finalOVR(p,bestPosition(p))*.65+fit*20+chem*2;
}
function getCandidateRole(p,i){
 const need=neededPositions()[0];
 if(need&&bestPosition(p)===need&&positionCompatibility(p,need)>=.95)return"🔥 最優先！";
 if(candidateNeedScore(p)>=78)return"⭐ 強力候補";
 if(i===2)return"💎 隠れた当たり";
 return"⚡ バランス型";
}
function previewChemistry(p){
 let nation=0,club=0,context=0;
 drafted.forEach(x=>{
  if(x.nationality===p.nationality)nation++;
  if(normalizeTeam(x.team)===normalizeTeam(p.team))club++;
  if(x.year===p.year&&normalizeTeam(x.team)===normalizeTeam(p.team))context++;
 });
 return {nation,club,context};
}
function getCandidates(c){
 const e=c.players.filter(p=>!usedPlayerIds.has(p.id));
 if(e.length<=3)return e;
 const ranked=[...e].sort((a,b)=>candidateNeedScore(b)-candidateNeedScore(a));
 const first=ranked[0];
 const second=ranked.find(p=>bestPosition(p)!==bestPosition(first))||ranked[1];
 const rest=ranked.filter(p=>p.id!==first.id&&p.id!==second.id);
 rest.sort((a,b)=>(candidateNeedScore(b)-baseOVR(b))-(candidateNeedScore(a)-baseOVR(a)));
 return [first,second,rest[0]].filter(Boolean);
}

/* ---------- Draft ---------- */
function startGame(){
 formation=$("formationSelect")?.value||"4-3-3";drafted=[];usedPlayerIds.clear();usedConditionKeys.clear();
 skips=3;draftCount=0;showScreen("draftScreen");updateDraftUI();nextDraft();
}
function showScreen(id){["startScreen","draftScreen","finalScreen"].forEach(x=>{const e=$(x);if(e)e.style.display=x===id?"":"none"})}
function updateDraftUI(){
 if($("draftCount"))$("draftCount").textContent=`${draftCount}/11`;
 if($("skipCount"))$("skipCount").textContent=skips;
 if($("currentFormation"))$("currentFormation").textContent=formation;
 updateNeededPosition();renderDrafted();
 if($("strategyMessage")){
  const n=neededPositions()[0],c=chemistryScore(drafted),co=comboScore(drafted);
  $("strategyMessage").textContent=`${n?"今ほしいポジション: "+n:"ポジションは充足！"}　｜　ケミストリー ${c}　｜　コンボ ${co.total}`;
 }
}
function nextDraft(){
 if(drafted.length>=11)return finishGame();
 currentCondition=pickCondition();
 if(!currentCondition)return finishGame();
 if($("condition"))$("condition").textContent=conditionLabel(currentCondition);
 renderCandidates(getCandidates(currentCondition));updateDraftUI();
}
function renderCandidates(candidates){
 const box=$("candidates");if(!box)return;
 box.innerHTML=candidates.map((p,i)=>{
  const bp=bestPosition(p),need=neededPositions()[0],fit=need?Math.round(positionCompatibility(p,need)*100):100;
  const c=previewChemistry(p);
  return `<button class="candidate-card" data-index="${i}">
   <div class="candidate-top"><span class="candidate-number">${i+1}</span><strong>${esc(p.name)}</strong><span class="ovr">${finalOVR(p,bp)}</span></div>
   <div class="candidate-role">${getCandidateRole(p,i)}</div>
   <div>${esc(p.nationality)} / ${esc(p.team)} ${p.year}</div>
   <div class="candidate-meta"><span>本来: ${esc(p.naturalPosition||p.position||bp)}</span><span>最適: ${bp}</span>${need?`<span>必要${need}: ${fit}%</span>`:""}</div>
   <div class="stats"><span>PAC ${p.pac}</span><span>SHO ${p.sho}</span><span>PAS ${p.pas}</span><span>DRI ${p.dri}</span><span>DEF ${p.def}</span><span>PHY ${p.phy}</span></div>
   <div class="bonus">タイトル +${p.titleBonus} / 個人賞 +${p.awardBonus}</div>
   <div class="chem-preview">${c.nation?`🤝 同国 +${c.nation}`:""} ${c.club?`🏟️ 同クラブ +${c.club}`:""} ${c.context?`🔥 同年同クラブ +${c.context}`:""}${!c.nation&&!c.club&&!c.context?"🔗 新しいケミストリー候補":""}</div>
  </button>`;
 }).join("");
 box.querySelectorAll(".candidate-card").forEach(btn=>btn.addEventListener("click",()=>chooseCandidate(candidates[Number(btn.dataset.index)])));
}
function chooseCandidate(p){
 if(!p)return;
 const same=drafted.find(x=>x.id===p.id);
 if(same){
  if(!confirm(`${p.name}はすでに獲得済み！\n\nこのカードに入れ替える？`)){nextDraft();return}
  drafted[drafted.findIndex(x=>x.id===p.id)]=p;
 }else{drafted.push(p);usedPlayerIds.add(p.id)}
 draftCount=drafted.length;updateDraftUI();drafted.length>=11?finishGame():nextDraft();
}
function skipDraft(){if(skips<=0)return;skips--;updateDraftUI();nextDraft()}
function renderDrafted(){
 const box=$("draftedList");if(!box)return;
 box.innerHTML=drafted.map((p,i)=>`<div class="drafted-player"><span>${i+1}</span><strong>${esc(p.name)}</strong><span>${esc(p.nationality)}</span><span>${bestPosition(p)}</span><b>${finalOVR(p,bestPosition(p))}</b></div>`).join("");
}

/* ---------- Optimal lineup / final ---------- */
function slotList(){const o=[];(formations[formation]||formations["4-3-3"]).forEach(([p,n])=>{for(let i=0;i<n;i++)o.push(p)});return o}
function bestLineup(team){
 const slots=slotList(),n=team.length,memo=new Map();
 function dp(i,mask){
  if(i===slots.length)return{score:0,assign:[]};
  const key=i+"|"+mask;if(memo.has(key))return memo.get(key);
  let best={score:-Infinity,assign:[]};
  for(let j=0;j<n;j++)if(!(mask&(1<<j))){
   const p=team[j],pos=slots[i],value=finalOVR(p,pos)*positionCompatibility(p,pos),next=dp(i+1,mask|(1<<j));
   if(value+next.score>best.score)best={score:value+next.score,assign:[{player:p,pos},...next.assign]};
  }
  memo.set(key,best);return best;
 }
 return dp(0,0);
}
function evaluateTeam(){
 const lineup=bestLineup(drafted),playerAvg=lineup.score/11,chem=chemistryScore(drafted),combo=comboScore(drafted);
 let fit=0;lineup.assign.forEach(x=>fit+=positionCompatibility(x.player,x.pos));fit=fit/11*10;
 const total=Math.min(100,Math.round(playerAvg+chem*.45+combo.total*.45+fit*.5));
 return{lineup,playerAvg,chem,combo,fit,total};
}
function rankFor(s){return s>=95?"S+":s>=90?"S":s>=85?"A+":s>=80?"A":s>=75?"B+":s>=70?"B":"C"}
function finishGame(){
 const r=evaluateTeam();showScreen("finalScreen");
 if($("teamScore"))$("teamScore").textContent=r.total;if($("teamRank"))$("teamRank").textContent=rankFor(r.total);
 if($("playerScore"))$("playerScore").textContent=Math.round(r.playerAvg);if($("chemistryScore"))$("chemistryScore").textContent=Math.round(r.chem);
 if($("comboScore"))$("comboScore").textContent=Math.round(r.combo.total);if($("formationScore"))$("formationScore").textContent=Math.round(r.fit*10);
 renderPitch(r.lineup.assign);renderFinalPlayers(r.lineup.assign,r.combo.labels,r.combo.progress);
}
function renderPitch(a){
 const box=$("pitch");if(!box)return;
 box.innerHTML=a.map(x=>`<div class="pitch-player ${x.pos.toLowerCase()}" title="${esc(x.player.name)}"><b>${esc(x.player.name)}</b><span>${x.pos} ${finalOVR(x.player,x.pos)}</span></div>`).join("");
}
function renderFinalPlayers(a,labels,progress=[]){
 const box=$("finalPlayers");if(!box)return;
 box.innerHTML=`${labels.length?`<div class="combo-result">${labels.map(esc).join(" / ")}</div>`:""}
 ${progress.length?`<div class="combo-progress">狙えたコンボ: ${progress.map(esc).join(" / ")}</div>`:""}
 ${a.map((x,i)=>`<div class="final-player"><span>${i+1}</span><strong>${esc(x.player.name)}</strong><span>${x.pos}</span><span>${esc(x.player.nationality)}</span><b>${finalOVR(x.player,x.pos)}</b></div>`).join("")}`;
}
function bindEvents(){
 $("startBtn")?.addEventListener("click",startGame);$("skipBtn")?.addEventListener("click",skipDraft);
 $("restartBtn")?.addEventListener("click",()=>showScreen("startScreen"));
}
(async function init(){bindEvents();await loadPlayers()})();
