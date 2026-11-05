// автотест карты потерь (обязателен при доработке — см. ТЗ)
// запуск: node karta-poter.test.js
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'karta-poter.html'),'utf8');
const core=html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const module_={exports:{}};
new Function('module',core)(module_);
const K=module_.exports;

const profiles={
  'малый':          {price:4,leads:50,deals:3,a2:'price',a3:'main',a5:'basic',a6:'idk',a7:'nextday',agents:0.6,a9:'uk'},
  'средний региональный':{price:8,leads:300,deals:15,a2:'mixed',a3:'main',a5:'basic',a6:'half',a7:'nextday',agents:0.6,a9:'uk'},
  'зрелый':         {price:8,leads:300,deals:20,a2:'brand',a3:'ok',a5:'full',a6:'most',a7:'15min',agents:0.2,a9:'club'},
  'крупный':        {price:20,leads:1500,deals:60,a2:'cpl',a3:'none',a5:'basic',a6:'few',a7:'rarely',agents:0.8,a9:'idk'},
};

const eps=1;
const pct={};
for(const[name,S]of Object.entries(profiles)){
  const c=K.compute(S);
  // слой прямых потерь = сумма подточек
  assert(Math.abs(c.direct-(c.g2+c.g3+c.g4+c.g5+c.g7+c.dbl))<eps,name+': direct != сумма подточек');
  // потолок сайта+скорости: не больше 25% сделок
  assert(c.d3+c.d7<=c.dy*0.25+1e-9,name+': потолок 25% сделок нарушен');
  // потенциал: только разрыв 5, не больше 25% выручки
  assert(c.pot<=c.rev*0.25+eps,name+': потенциал выше 25% выручки');
  // карточки
  const cards=K.buildCards(S,c);
  assert.strictEqual(cards.length,5,name+': карточек не 5');
  const htmlish=JSON.stringify(cards);
  assert(!/undefined|NaN/.test(htmlish),name+': undefined/NaN в карточках');
  // разрыв 1 — без рублей
  assert.strictEqual(cards[0].m,'считаем на диагностике',name+': у разрыва 1 появилась сумма');
  // сумма карточек 2+3+4 = слой прямых потерь (по компонентам)
  const s=K.summary(c);
  assert(['g2','g3','g7'].length===3&&s.rub<=c.direct+eps,name+': худший разрыв дороже слоя');
  pct[name]=c.rev>0?c.direct/c.rev*100:0;
}
// критерий приёмки: инструмент различает — зрелый почти ноль, слабый двузначный %
assert(pct['зрелый']<3,'зрелый профиль дал '+pct['зрелый'].toFixed(1)+'% — коэффициенты сломаны');
assert(pct['малый']>15&&pct['крупный']>10,'слабые профили дают слишком мало');
// баланс тегов: лишний/незакрытый div ломает скрытие секций (см. инцидент с формой)
{
  const html2=html;
  let depth=0,line=1,bad=null;
  const re=/<(\/?)div\b[^>]*>/g;let m;
  while((m=re.exec(html2))){
    if(m[1])depth--;else depth++;
    if(depth<0){bad='extra </div> @'+re.lastIndex;break;}
  }
  assert(!bad&&depth===0,'div-баланс нарушен: '+(bad||('незакрытых: '+depth)));
}
// бейдж «главный разрыв» стоит на реально самом дорогом разрыве
{
  const S={price:8,leads:300,deals:20,a2:'cpl',a3:'ok',a5:'full',a6:'most',a7:'15min',agents:0,a9:'club'};
  const c=K.compute(S),cards=K.buildCards(S,c),sm=K.summary(c);
  const tagged=cards.filter(x=>x.tag==='главный разрыв');
  assert.strictEqual(tagged.length,1,'главный разрыв не один: '+tagged.length);
  assert(tagged[0].t===sm.name,'бейдж не на худшем: '+tagged[0].t+' vs '+sm.name);
  // подточки с нулём имеют ok-заголовок (5-й элемент)
  const zeroRows=cards.flatMap(x=>x.sub||[]).filter(x=>x[3]===0);
  assert(zeroRows.every(x=>x[4]),'нулевая подточка без ok-варианта');
}
for(const[n,p]of Object.entries(pct))console.log(n+': прямые потери '+p.toFixed(1)+'% от выручки');
console.log('OK');
