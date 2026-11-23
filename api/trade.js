import {get,put} from "@vercel/blob";
import {createHash, randomUUID} from "node:crypto";
const path="market-v1.json";
const goods={milk:40,syrup:60};
function fail(message){throw new Error("rule:"+message)}
function trade(world,id,b){
 let p=world.players[id];
 if(!p){
   if(b.action!=="join" || !["Кофейня","Магазин","Пекарня"].includes(b.type)) fail("Сначала подключите компанию.");
   p=world.players[id]={name:String(b.name||"Компания").slice(0,48),type:b.type,cash:1000,milk:0,syrup:0,produced:0,seq:0};
 }
 if(b.action==="join"||b.action==="read")return false;
 if(b.seq===p.seq)return false;
 if(b.seq!==p.seq+1)fail("Обновите биржу и повторите действие.");
 const item=b.item;
 if(b.action==="wholesale"||b.action==="offer"){
   if(p.type!=="Магазин"||!Object.hasOwn(goods,item))fail("Товар доступен магазинам.");
   if(b.action==="wholesale"){
     if(p.cash<goods[item])fail("Недостаточно средств.");
     p.cash-=goods[item];p[item]+=5;
   }else{
     if(p[item]<5)fail("Нужно пять единиц товара.");
     if(world.offers.filter(o=>o.owner===id).length>=12)fail("Уже выставлено 12 партий.");
     p[item]-=5;world.offers.push({id:randomUUID(),owner:id,item,price:goods[item]*2});
   }
 }else if(b.action==="buy"||b.action==="cancel"){
   const i=world.offers.findIndex(o=>o.id===b.offer);
   if(i<0)fail("Партия уже снята или продана.");
   const o=world.offers[i];
   if(b.action==="cancel"){if(o.owner!==id)fail("Это чужая партия.");}
   else{
     if(o.owner===id||p.cash<o.price)fail("Покупка недоступна.");
     p.cash-=o.price;world.players[o.owner].cash+=o.price;
   }
   p[o.item]+=5;world.offers.splice(i,1);
 }else if(b.action==="prepare"){
   if(p.type!=="Кофейня"||p.milk<1||p.syrup<1)fail("Нужны молоко и сироп.");
   p.milk--;p.syrup--;p.produced++;
 }else fail("Неизвестная операция.");
 p.seq++;return true;
}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).end();
 const token=req.headers.authorization?.replace(/^Bearer /,"");
 if(!/^[0-9a-f-]{36}$/.test(token||""))return res.status(401).end();
 const id=createHash("sha256").update(token).digest("hex");
 try{
 for(let attempt=0;attempt<5;attempt++){
   const file=await get(path,{access:"private",useCache:false});
   const world=file?await new Response(file.stream).json():{players:{},offers:[]};
   const existed=Boolean(world.players[id]);
   const changed=trade(world,id,req.body||{});
   if(changed||!existed){
     try{await put(path,JSON.stringify(world),{access:"private",addRandomSuffix:false,allowOverwrite:!!file,...(file?{ifMatch:file.blob.etag}:{})});}
     catch(err){if(attempt<4 && /precondition|already exists|condition/i.test(err.name+" "+err.message))continue;throw err;}
   }
   return res.json({player:world.players[id],offers:world.offers.map(o=>({id:o.id,name:world.players[o.owner].name,own:o.owner===id,item:o.item,price:o.price}))});
 }
 }catch(err){const rule=err.message.startsWith("rule:");return res.status(rule?409:503).json({error:rule?err.message.slice(5):"Биржа временно недоступна."});}
}