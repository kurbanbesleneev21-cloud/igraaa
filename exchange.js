"use strict";
const ingredientNames={milk:"Молоко",syrup:"Сироп"};
let exchangeBusy=false;
let exchangePlayer=null;
async function exchangeRequest(action,extra={}){
 const panel=document.getElementById("exchange");
 if(!panel||exchangeBusy)return;
 exchangeBusy=true;
 try{
   let token=localStorage.getItem("trade-token");
   if(!token){token=crypto.randomUUID();localStorage.setItem("trade-token",token);}
   const response=await fetch("/api/trade",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({action,type:state.company.type,name:state.company.title,seq:(exchangePlayer?.seq||0)+1,...extra})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Биржа недоступна.");
   const p=exchangePlayer=data.player;
   const added=p.produced-(state.receivedDrinks||0);
   if(added>0){state.stock+=added;state.receivedDrinks=p.produced;localStorage.setItem(key,JSON.stringify(state));}
   const control=(label,op,extra={})=>{const button=document.createElement("button");button.textContent=label;button.onclick=()=>exchangeRequest(op,extra);panel.append(button);};
   panel.replaceChildren();
   const line=text=>{const el=document.createElement("p");el.textContent=text;panel.append(el);};
   line("Торговый счёт: "+money(p.cash)+" · Молоко: "+p.milk+" · Сироп: "+p.syrup);
   line("Каждая компания получает 1 000 ₽ на отдельный торговый счёт. Одна партия — 5 единиц.");
   if(p.type==="Магазин")for(const [item,label] of Object.entries(ingredientNames)){control("Закупить: "+label+" · "+money(item==="milk"?40:60),"wholesale",{item});control("Выставить: "+label+" · "+money(item==="milk"?80:120),"offer",{item});}
   if(p.type==="Кофейня")control("Приготовить напиток на склад · 1 молоко + 1 сироп","prepare");
   if(!data.offers.length)line("Магазины пока не выставили партии.");
   for(const o of data.offers)control((o.own?"Снять":"Купить")+" · "+ingredientNames[o.item]+" × 5 · "+o.name+" · "+money(o.price),o.own?"cancel":"buy",{offer:o.id});
   control("Обновить предложения","read");
 }catch(err){panel.textContent=err.message;const retry=document.createElement("button");retry.textContent="Обновить биржу";retry.onclick=()=>exchangeRequest("join");panel.append(retry);}
 finally{exchangeBusy=false;if(!panel.isConnected&&document.getElementById("exchange"))window.showExchange();}
}
window.showExchange=()=>exchangeRequest("join");
