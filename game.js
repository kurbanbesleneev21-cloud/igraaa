"use strict";
const key = "real-business-life-v1";
const fresh = () => ({day:1,cash:50000,debt:0,tax:0,company:null,stock:0,staff:0,property:null,events:[],history:[]});
let state;
try { state = JSON.parse(localStorage.getItem(key)) || fresh(); } catch { state = fresh(); }
const tabs = ["Обзор","Компания","Карта","Рынок","Команда","Финансы"];
const properties = [["Центр",3000,1.65],["Арбат",2500,1.4],["Сокольники",1500,1.15],["Печатники",900,.9],["Марьино",1100,1],["Хамовники",2200,1.3]];
const industries = {"Кофейня":{item:"порции кофе",cost:100,price:230},"Магазин":{item:"товары",cost:220,price:415},"Пекарня":{item:"выпечка",cost:85,price:185}};
const demoTypes = {coffee:"Кофейня",shop:"Магазин",bakery:"Пекарня"};
try {
  const demo = JSON.parse(localStorage.getItem("real-business-life-demo-v1"));
  if (demo && !localStorage.getItem(key)) {
    const type = demoTypes[demo.company?.type];
    state = {...fresh(),day:demo.day,cash:demo.cash,stock:demo.stock,
      company:type ? {title:demo.company.title,type,price:industries[type].price} : null,
      property:[0,2,3,1][demo.district] ?? null,
      events:demo.journal.map(message=>({day:demo.day,message}))};
    localStorage.setItem(key,JSON.stringify(state));
  }
} catch {}
let tab = 2;
let selected = state.property ?? 0;
let zoom = 1;
let camera = {left:0,top:0};
let noticeTimer;
const money = n => new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(n);
const escape = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const byId = id => document.getElementById(id);
function tell(message) {
  byId("notice").textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { byId("notice").textContent = ""; },3500);
}
function commit(message, eventDay = state.day) {
  state.events.unshift({day:eventDay,message});
  state.events = state.events.slice(0,100);
  try { localStorage.setItem(key,JSON.stringify(state)); } catch { tell("Браузер не смог сохранить игру."); }
  render();
}
function charge(amount) {
  if (state.cash < amount) { tell("Недостаточно средств."); return false; }
  state.cash -= amount;
  return true;
}
function advance() {
  const business = industries[state.company?.type];
  const property = properties[state.property];
  const demand = (property?.[2] ?? 0) * (1 + .22 * Math.sin(state.day * 1.3));
  const units = business ? Math.min(state.stock,Math.max(0,Math.floor((12 + state.staff * 9) * demand * business.price / state.company.price))) : 0;
  const revenue = units ? units * state.company.price : 0;
  const expenses = (property?.[1] ?? 0) + state.staff * 600 + Math.ceil(state.debt * .002);
  const profit = revenue - expenses - units * (business?.cost ?? 0);
  const tax = Math.floor(Math.max(0,profit) * .06);
  state.cash += revenue - expenses;
  state.tax += tax;
  state.stock -= units;
  state.history.push({revenue,expenses:expenses + units * (business?.cost ?? 0),profit:profit - tax});
  state.history = state.history.slice(-30);
  const completedDay = state.day++;
  commit("Продано " + units + " ед. · прибыль " + money(profit - tax),completedDay);
}
const card = (name,value) => '<div class="card metric"><small>'+name+'</small><strong>'+value+'</strong></div>';
const action = (name,label,value="") => '<button data-action="'+name+'" value="'+value+'">'+label+'</button>';
const block = (title,body) => '<section class="card"><h2>'+title+'</h2>'+body+'</section>';
const activity = () => state.events.length ? state.events.slice(0,8).map(e=>'<p>День '+e.day+' · '+escape(e.message)+'</p>').join("") : '<p>Здесь появятся ваши операции.</p>';
function overview() {
  const last = state.history.at(-1) || {revenue:0,expenses:0,profit:0};
  const history = state.history.slice(-14);
  const peak = Math.max(1,...history.map(x=>Math.abs(x.profit)));
  return '<p>Откройте компанию, арендуйте помещение и закупите первую партию товара.</p><div class="grid">'
    +card("Денежный баланс",money(state.cash))+card("Выручка за день",money(last.revenue))+card("Расходы за день",money(last.expenses))+card("Чистая прибыль",money(last.profit))+'</div>'
    +'<div class="stack">'+block("Динамика прибыли", history.length ? '<div class="chart" aria-hidden="true">'+history.map(x=>'<span class="'+(x.profit<0?"negative":"")+'" style="height:'+Math.max(2,Math.round(100*Math.abs(x.profit)/peak))+'%"></span>').join("")+'</div><small>Последние '+history.length+' игровых дней</small>':'<p>Проведите первый игровой день, чтобы увидеть результаты.</p>')+block("Журнал операций",activity())+'</div>';
}
function company() {
  if (!state.company) return block("Открыть компанию",'<form id="register" class="stack"><label>Название<input name="title" maxlength="48" required autocomplete="off"></label><label>Тип здания<select name="type">'+Object.keys(industries).map(v=>'<option value="'+v+'">'+v+' · '+money(buildPrice(v))+'</option>').join("")+'</select></label><div><button>Построить на выбранном участке</button></div></form>');
  return block(escape(state.company.title),'<p>'+escape(state.company.type)+' · '+(state.property===null?"Требуется помещение":escape(properties[state.property][0]))+'</p><form id="pricing" class="stack"><label>Цена за единицу, ₽<input name="price" type="number" min="1" max="100000" required value="'+state.company.price+'"></label><div><button>Сохранить цену</button></div></form>');
}
const cityWidth = 1510;
const cityHeight = 880;
const cityLots = [[398,94],[85,116],[745,108],[735,447],[76,449],[410,445]];
const cityBlocks = [
  [44,65,235,209],[351,57,248,219],[675,62,225,212],
  [44,368,235,213],[351,369,248,213],[675,369,225,218]
];
properties.push(["Таганка",1200,1.15],["Якиманка",1400,1.25],["Лефортово",750,.95],["Басманный",1250,1.2],["Измайлово",800,1],["Даниловский",950,1.05]);
cityLots.push([1000,95],[1250,100],[1005,450],[1250,440],[190,690],[680,685]);
for (const [x,y] of cityLots.slice(6)) cityBlocks.push([x-25,y-22,248,195]);
const buildPrice = type => type==="Магазин"?1800:type==="Пекарня"?1500:1200;
function cafeRoom(index) {
  const ownCafe = state.property===index && state.company?.type==="Кофейня";
  if (!ownCafe) return "";
  const staffed = state.staff>0;
  return '<span class="cafe-room'+(staffed?' staffed':'')+'" aria-hidden="true">'
    +'<span class="cafe-window"></span><span class="cafe-bench"></span><span class="cafe-entry"></span>'
    +'<span class="cafe-counter"><i class="espresso-machine"></i><i class="grinder"></i><i class="cups"></i><i class="register"></i></span>'
    +'<span class="cafe-table first"></span><span class="cafe-table second"></span><span class="cafe-table third"></span>'
    +'<i class="person barista"></i><i class="person waiter"></i><i class="person guest"></i></span>';
}
function streetLife() {
  return '<div class="street-life" aria-hidden="true">'
    +'<div class="crosswalk"></div><i class="person walker one"></i><i class="person walker two"></i>'
    +'<i class="person walker three"></i><i class="person walker four"></i></div>';
}
function map() {
  const [name,rent,demand] = properties[selected];
  const occupied = state.property===selected;
  const propertyTitle = occupied ? escape(state.company.title) : "Свободный участок";
  const cafe = occupied && state.company?.type==="Кофейня";
  const detail = cafe ? (state.staff ? '<p>Бариста готовит кофе за стойкой, официант обслуживает столики.</p>' : '<p>Вы за стойкой. Наймите сотрудника, чтобы открыть обслуживание столиков.</p>'+action("openTeam","Перейти к команде")) : "";
  const terrain = cityBlocks.map(([x,y,w,h],index) => '<div aria-hidden="true" class="city-block block-'+index+'" style="left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px"><i></i><i></i><i></i></div>').join("");
  const buildings = cityLots.map(([x,y],index)=>{
    const leased = state.property===index;
    const title = leased ? escape(state.company.title) : "Свободный участок";
    const interior = cafeRoom(index) || (leased ? '<span class="shop-floor"><i></i><i></i><i></i></span>' : "");
    const sign = leased ? '<span class="lot-sign">'+title+'</span>' : "";
    return '<button type="button" class="lot'+(leased?' leased':'')+'" data-action="selectLot" value="'+index
      +'" aria-label="'+title+', '+properties[index][0]+'" aria-pressed="'+(selected===index)
      +'" style="left:'+x+'px;top:'+y+'px">'+(interior||'<span aria-hidden="true" class="plot"></span>')+sign+'</button>';
  }).join("");
  return '<div class="map-toolbar"><p>Проведите пальцем или потяните мышью, чтобы осмотреть город. Выберите участок, затем тип здания. За строительство платят один раз, за землю — каждый игровой день.</p><div class="row">'+action("zoomOut","− Отдалить")+action("zoomIn","+ Приблизить")+action("centerLot","К выбранному зданию")+'</div></div>'
    +'<div class="city-viewport" id="city-scroll" tabindex="0" aria-label="Прокручиваемая карта Москвы"><div class="city-size" style="width:'+cityWidth*zoom+'px;height:'+cityHeight*zoom+'px"><div class="city" style="transform:scale('+zoom+')">'+terrain+'<div class="city-road horizontal" aria-hidden="true">САДОВОЕ КОЛЬЦО</div><div class="city-road road-west" aria-hidden="true"></div><div class="city-road road-east" aria-hidden="true"></div>'+streetLife()+buildings+'</div></div></div>'
    +'<div class="lot-details" id="lot-details">'+block(propertyTitle,'<p>'+name+' · '+money(rent)+' в день · спрос '+Math.round(demand*100)+'%</p>'+detail+(!state.company?action("openCompany","Выбрать бизнес и построить"):occupied?action("cancelLease","Отказаться от аренды"):action("lease","Построить здесь · "+money(buildPrice(state.company.type)),selected)))+'</div>';
}
function positionMap() {
  const viewport = byId("city-scroll");
  if (!viewport) return;
  viewport.scrollLeft = camera.left;
  viewport.scrollTop = camera.top;
}
function centerMap(viewport) {
  const lot = viewport.querySelector('[data-action="selectLot"][aria-pressed="true"]');
  if (!lot) return;
  camera = {
    left:(lot.offsetLeft+lot.offsetWidth/2)*zoom-viewport.clientWidth/2,
    top:(lot.offsetTop+lot.offsetHeight/2)*zoom-viewport.clientHeight/2
  };
}
function mapAction(button) {
  const viewport = byId("city-scroll");
  if (!viewport) return;
  camera = {left:viewport.scrollLeft,top:viewport.scrollTop};
  const command = button.dataset.action;
  if (command==="selectLot") selected = Number(button.value);
  if (command==="zoomIn" || command==="zoomOut") {
    const prior = zoom;
    zoom = Math.min(1.6,Math.max(1,Math.round((zoom+(command==="zoomIn"?.2:-.2))*10)/10));
    camera.left = (camera.left+viewport.clientWidth/2)*zoom/prior-viewport.clientWidth/2;
    camera.top = (camera.top+viewport.clientHeight/2)*zoom/prior-viewport.clientHeight/2;
  }
  if (command==="centerLot") {
    centerMap(viewport);
  }
  render();
  const selector = command==="selectLot"?'[data-action="selectLot"][aria-pressed="true"]':'[data-action="'+command+'"]';
  byId("view").querySelector(selector)?.focus({preventScroll:true});
}
function supplier() {
  if (!state.company) return block("Поставщики","<p>Сначала зарегистрируйте компанию.</p>");
  const {item,cost} = industries[state.company.type];
  return block("Оптовый поставщик",'<p>Ассортимент · '+item+' · '+money(cost)+' за единицу.</p><p>На складе · '+state.stock+' ед.</p><form id="purchase" class="stack"><label>Количество<input name="quantity" type="number" min="1" max="500" value="10" required></label><div><button>Закупить товар</button></div></form>');
}
function market() {
  return supplier() + (state.company ? block("Биржа игроков",'<div id="exchange"></div>') : "");
}
function team() {
  return block("Сотрудники",'<p>В штате · '+state.staff+' человек. Каждый сотрудник добавляет до 9 продаж в день при базовом спросе. Зарплата · '+money(600)+' в день.</p><div class="row">'+action("hire","Нанять")+action("fire","Уволить")+'</div>');
}
function finances() {
  return '<div class="grid">'+card("Баланс",money(state.cash))+card("Кредит",money(state.debt))+card("Игровой налог к уплате",money(state.tax))+'</div>'+block("Банк и налоги",'<p>Кредит · '+money(20000)+' под 0,2% за игровой день. Налог · 6% от положительной операционной прибыли.</p><div class="row">'+action("borrow","Взять кредит")+action("repay","Погасить кредит")+action("tax","Уплатить налог")+'</div>');
}
function render() {
  const previousMap = byId("city-scroll");
  if (previousMap && tab!==2) camera = {left:previousMap.scrollLeft,top:previousMap.scrollTop};
  byId("clock").textContent = "Москва · День "+state.day;
  byId("nav").innerHTML = tabs.map((label,i)=>'<button data-tab="'+i+'"'+(tab===i?' aria-current="page"':'')+'>'+label+'</button>').join("");
  byId("view").innerHTML = '<div class="kicker">Экономический симулятор</div><h1>'+tabs[tab]+'</h1>'+[overview,company,map,market,team,finances][tab]();
  positionMap();
  if(tab===3 && state.company) window.showExchange?.();
}
byId("advance").addEventListener("click",advance);
byId("nav").addEventListener("click",event=>{
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  tab = Number(button.dataset.tab);
  render();
  byId("nav").querySelector('[aria-current="page"]').focus({preventScroll:true});
});
byId("view").addEventListener("submit",event=>{
  event.preventDefault();
  const form = new FormData(event.target);
  if (event.target.id==="register") {
    const title = String(form.get("title")).trim();
    const type = form.get("type");
    if (!title || !Object.hasOwn(industries,type)) return tell("Введите название компании.");
    if (!charge(buildPrice(type))) return;
    state.property=selected;
    tab=2;
    state.company = {title,type,price:industries[type].price};
    commit("Построено здание компании «"+title+"».");
  } else if (event.target.id==="purchase") {
    const quantity = Number(form.get("quantity"));
    if (!Number.isInteger(quantity) || quantity<1 || quantity>500) return;
    if (!charge(quantity*industries[state.company.type].cost)) return;
    state.stock += quantity;
    commit("Закуплено "+quantity+" ед.");
  } else if (event.target.id==="pricing") {
    const price = Number(form.get("price"));
    if (!Number.isInteger(price) || price<1 || price>100000) return;
    state.company.price = price;
    commit("Цена обновлена до "+money(price)+".");
  }
});
byId("view").addEventListener("click",event=>{
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const viewport = byId("city-scroll");
  if (viewport) camera = {left:viewport.scrollLeft,top:viewport.scrollTop};
  switch (button.dataset.action) {
    case "selectLot":
    case "zoomIn":
    case "zoomOut":
    case "centerLot":
      return mapAction(button);
    case "openTeam":
      tab=4;
      return render();
    case "openCompany":
      tab=1;
      render();
      return byId("view").querySelector("input")?.focus();
    case "lease": {
      if (!state.company) return tell("Сначала зарегистрируйте компанию.");
      const index = Number(button.value);
      if (state.property===index) return tell("Вы уже арендуете здесь помещение.");
      if (!charge(buildPrice(state.company.type))) return;
      state.property = index;
      return commit("Подписана ежедневная аренда · "+properties[index][0]+".");
    }
    case "cancelLease":
      state.property=null;
      return commit("Аренда прекращена.");
    case "hire":
      if (!state.company) return tell("Сначала зарегистрируйте компанию.");
      if (state.staff>=10) return tell("В штате уже десять сотрудников.");
      state.staff++;
      return commit("Нанят сотрудник.");
    case "fire":
      if (!state.staff) return tell("В штате пока никого нет.");
      state.staff--;
      return commit("Сотрудник уволен.");
    case "borrow":
      if (!state.company) return tell("Кредит доступен зарегистрированной компании.");
      if (state.debt) return tell("Сначала погасите текущий кредит.");
      state.debt=20000;
      state.cash+=state.debt;
      return commit("Получен кредит на "+money(state.debt)+".");
    case "repay":
      if (!state.debt) return tell("Нет непогашенного кредита.");
      if (!charge(state.debt)) return;
      state.debt=0;
      return commit("Кредит погашен.");
    case "tax":
      if (!state.tax) return tell("Начисленных налогов пока нет.");
      if (!charge(state.tax)) return;
      state.tax=0;
      return commit("Игровой налог уплачен.");
  }
});
let drag;
const view = byId("view");
view.addEventListener("pointerdown",event=>{
  const viewport = event.target.closest("#city-scroll");
  if (!viewport || event.pointerType!=="mouse" || event.button!==0 || event.target.closest("button")) return;
  drag = {viewport,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add("dragging");
});
view.addEventListener("pointermove",event=>{
  if (!drag) return;
  drag.viewport.scrollLeft = drag.left+drag.x-event.clientX;
  drag.viewport.scrollTop = drag.top+drag.y-event.clientY;
});
for (const type of ["lostpointercapture","pointercancel"]) view.addEventListener(type,()=>{
  drag?.viewport.classList.remove("dragging");
  drag = undefined;
});
render();
const initialMap = byId("city-scroll");
if (initialMap) {
  centerMap(initialMap);
  positionMap();
}
