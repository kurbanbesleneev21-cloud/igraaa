"use strict";
const key = "real-business-life-demo-v1";
const initial = {day:1,cash:35000,stock:0,company:null,district:null,journal:[]};
let state = initial;
try { state = JSON.parse(localStorage.getItem(key)) || initial; } catch {}
const businesses = {
  coffee: {name:"Кофейня", cost:90, price:240},
  shop: {name:"Магазин", cost:180, price:370},
  bakery: {name:"Пекарня", cost:70, price:185}
};
const districts = [
  {name:"Центр", rent:1600, demand:20},
  {name:"Сокольники", rent:700, demand:12},
  {name:"Печатники", rent:400, demand:8},
  {name:"Арбат", rent:1100, demand:16}
];
const get = id => document.getElementById(id);
const money = new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0});
const rub = amount => money.format(amount);
function record(description, change) {
  state.cash += change;
  state.journal.unshift("День " + state.day + " · " + description + " · " + (change >= 0 ? "+" : "−") + rub(Math.abs(change)));
  state.journal.length = Math.min(30, state.journal.length);
}
function save(message) {
  try { localStorage.setItem(key, JSON.stringify(state)); }
  catch { message += " Браузер не сохранил прогресс."; }
  render();
  get("status").textContent = message;
}
const districtButtons = districts.map((district, index) => {
  const button = document.createElement("button");
  button.textContent = district.name + " · " + rub(district.rent) + "/день";
  button.onclick = () => {
    if (!state.company) return;
    state.district = index;
    save("Выбран район " + district.name + ". Спрос до " + district.demand + " единиц в день.");
  };
  get("districts").append(button);
  return button;
});
function render() {
  const company = state.company && businesses[state.company.type];
  get("day").textContent = state.day;
  get("cash").textContent = rub(state.cash);
  get("stock").textContent = state.stock;
  get("company").hidden = Boolean(company);
  get("business").textContent = company ? state.company.title + " · " + company.name : "";
  get("market").textContent = company
    ? "Закупка " + rub(company.cost) + " за единицу. Продажа " + rub(company.price) + " за единицу."
    : "Рынок откроется после регистрации компании.";
  get("buy").disabled = !company || state.cash < company.cost * 10;
  get("next").disabled = !company || state.district === null;
  districtButtons.forEach((button,index) => {
    button.disabled = !company;
    button.setAttribute("aria-pressed", String(state.district === index));
  });
  get("ledger").replaceChildren(...state.journal.map(entry => {
    const item = document.createElement("li");
    item.textContent = entry;
    return item;
  }));
}
get("company").onsubmit = event => {
  event.preventDefault();
  if (state.company || state.cash < 2000) return;
  const form = new FormData(event.currentTarget);
  const title = form.get("title").trim();
  if (!title) { get("status").textContent = "Введите название компании."; return; }
  state.company = {title,type:form.get("type")};
  record("Регистрация компании", -2000);
  save("Компания открыта. Выберите район.");
};
get("buy").onclick = () => {
  if (!state.company) return;
  const cost = businesses[state.company.type].cost * 10;
  if (state.cash < cost) return;
  state.stock += 10;
  record("Закупка 10 единиц", -cost);
  save("Товар добавлен на склад.");
};
get("next").onclick = () => {
  if (!state.company || state.district === null) return;
  const district = districts[state.district];
  if (state.cash < district.rent) { get("status").textContent = "Недостаточно денег на аренду. Выберите более дешёвый район."; return; }
  const units = Math.min(state.stock, district.demand);
  const revenue = units * businesses[state.company.type].price;
  state.stock -= units;
  record("Аренда", -district.rent);
  if (units) record("Продано единиц: " + units, revenue);
  state.day++;
  save("Продано " + units + " ед. Выручка " + rub(revenue) + ", аренда " + rub(district.rent) + ".");
};
render();
