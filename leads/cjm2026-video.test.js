// автотест страницы выпуска CJM 2026: выпуски, ссылки из архива, проверка формы и контракт заявки
// запуск: node cjm2026-video.test.js
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const core=read('cjm2026-video.html').match(/<script id="core">([\s\S]*?)<\/script>/)[1];

// грузим ядро как в браузере: с адресом выпуска и без
function load(search){
  const ctx={URLSearchParams,location:{search,replace(u){ctx.redirect=u;}},document:{title:''}};
  vm.runInNewContext(core,ctx);
  return ctx;
}
const ok=load('?v=3'), K=ok.CJM;
assert.strictEqual(ok.CUR.v,3);
assert(ok.document.title.startsWith('выпуск 3: '),'title не про выпуск');
assert.strictEqual(load('?v=9').redirect,'cjm2026','несуществующий выпуск не уводит в архив');
assert.strictEqual(load('').redirect,'cjm2026','без ?v не уводит в архив');

// шесть выпусков, видео не повторяются, карточки архива ведут ровно на них
const nums=Object.keys(K.EPS).map(Number);
assert.deepStrictEqual(nums,[1,2,3,4,5,6]);
assert.strictEqual(new Set(nums.map(n=>K.EPS[n].id)).size,6,'id видео повторяются');
const links=[...read('cjm2026.html').matchAll(/<a class="ep" href="([^"]+)"/g)].map(m=>m[1]);
assert.deepStrictEqual(links,nums.map(n=>'cjm2026-video?v='+n),'карточки архива не на страницы выпусков');
assert.strictEqual(K.embed(K.EPS[5]),'https://vkvideo.ru/video_ext.php?oid=-217187875&id=456239164&hd=2&hash=42e8e73da472a3e7');
// без hash видео «по ссылке» во фрейме «недоступно» — у каждого выпуска должен быть свой ключ
for(const n of nums) assert(/^[0-9a-f]{16}$/.test(K.EPS[n].hash||'')&&K.playable(K.EPS[n]),'нет hash у выпуска '+n);
assert.strictEqual(new Set(nums.map(n=>K.EPS[n].hash)).size,6,'hash повторяются');
// запасной путь: без hash и open — обложка со ссылкой на VK вместо фрейма
assert(!K.playable({id:1})&&K.playable({id:1,open:true}));
for(const n of nums) assert(fs.existsSync(path.join(__dirname,'img','cjm2026-'+n+'.jpg')),'нет обложки '+n);

// проверка полей — как в остальных магнитах
for(const v of ['+7 (900) 000-00-00','89000000000','@bureau_nick','bureau_nick']) assert(K.validContact(v),v);
for(const v of ['','12345','+7 (900) 000-00','@abc','мой телефон']) assert(!K.validContact(v),v);
assert(K.validName('Ая')&&!K.validName('a')&&!K.validName('12'));
// компания обязательна: короткие названия девелоперов проходят, пустое и мусор — нет
for(const v of ['ПИК','А101','ГК ФСК','ЖК «Ривер»']) assert(K.validCompany(v),v);
for(const v of ['','  ','—','-.']) assert(!K.validCompany(v),JSON.stringify(v));
// у каждого выпуска свой заголовок формы — результат разбора, а не вопрос
for(const n of nums) assert(K.EPS[n].o&&K.EPS[n].o.length<=120&&!/\?$/.test(K.EPS[n].o),'заголовок формы выпуска '+n);
assert.strictEqual(new Set(nums.map(n=>K.EPS[n].o)).size,6,'заголовки форм повторяются');

// контракт бота: имя и контакт по закрытому списку ключей, иначе приёмник отвечает 400 и заявка теряется
const lead={name:'Ая',company:'=ООО',contact:'@bureau_nick'};
const bot=K.botBody(ok.CUR,lead,'https://marketing.bureausuchkov.com/leads/cjm2026-video?v=3');
assert.strictEqual(bot['Имя'],'Ая');
assert.strictEqual(bot['Контакт'],'@bureau_nick');
assert(/^вопрос по выпуску 3 · /.test(bot._source)&&bot['Тема'].startsWith('выпуск 3: '));
assert(JSON.stringify(bot).length<10000,'тело заявки больше лимита 10 КБ');
// таблица: лист из белого списка, формулы экранированы
const sh=K.sheetBody(ok.CUR,lead,'p');
assert.strictEqual(sh._sheet,'архив CJM 2026');
assert.strictEqual(sh.company,"'=ООО",'формула не экранирована');

console.log('ok — страница выпуска CJM 2026');
