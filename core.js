(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.OrderCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
  const money=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(n);
  const step=p=>Number.isSafeInteger(p.portion)&&p.portion>0?p.portion:1;
  const validQty=(p,q)=>Number.isSafeInteger(q)&&q>=step(p)&&q<=100000&&q%step(p)===0;
  const known=p=>Number.isFinite(p.price)&&p.price>=0&&p.currency==='RUB';
  function restore(raw,products){
    const result={};try{const obj=JSON.parse(raw);if(!obj||Array.isArray(obj))return result;
      for(const p of products){const q=obj[p.row];if(validQty(p,q))result[p.row]=q;}
    }catch{}return result;
  }
  function lines(cart,products){return products.filter(p=>validQty(p,cart[p.row])).map(p=>({product:p,quantity:cart[p.row],total:known(p)?Math.round(p.price*cart[p.row]*100)/100:null}));}
  function totals(items){return {quantity:items.reduce((n,x)=>n+x.quantity,0),amount:Math.round(items.reduce((n,x)=>n+(x.total??0),0)*100)/100,incomplete:items.some(x=>x.total===null||!x.product.portion)};}
  function validate(c){const e={};if(!c.name.trim())e.name='Напишите ваше имя.';
    const digits=c.phone.replace(/\D/g,'');if(digits.length<7||digits.length>15||!/^[+\d\s().\-]+$/.test(c.phone.trim()))e.phone='Введите телефон с кодом страны, например +7 999 123-45-67.';
    if(!c.address.trim())e.address='Напишите адрес доставки: город, улицу и дом.';return e;}
  const clean=c=>Object.fromEntries(['name','phone','address','comment'].map(k=>[k,(c[k]||'').trim()]));
  function fingerprint(items,c){return JSON.stringify({items:items.map(x=>[x.product.row,x.product.name,x.product.price,x.product.portion,x.product.currency,x.quantity]),contact:clean(c)});}
  function prepare(items,c,previous,uuid,now){const fp=fingerprint(items,c);if(previous?.fingerprint===fp)return previous;
    const id=uuid();return {uuid:id,number:'ВЦ-'+id.replace(/-/g,'').slice(0,10).toUpperCase(),date:now(),fingerprint:fp};}
  function message(items,contact,order){const c=clean(contact),t=totals(items);
    const when=new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Moscow'}).format(new Date(order.date));
    return ['Здравствуйте, Екатерина!',`Меня зовут ${c.name}. Хочу заказать георгины во «Времени цветов».`,'','Мой заказ:',...items.flatMap((x,i)=>{const p=x.product;return [`${i+1}. ${p.name} — ${x.quantity} ${p.unit}`,`Строка: ${p.row}`,...(p.size?[`Размер/вариант: ${p.size}`]:[]),...(p.portion?[`Это ${x.quantity/p.portion} порц. по ${p.portion} ${p.unit}`]:['Пожалуйста, уточните подходящую порцию.']),known(p)?`${money(p.price)} за 1 ${p.unit} · за сорт: ${money(x.total)}`:'Пожалуйста, уточните цену и сумму по этому сорту.',''];}),`Всего: ${t.quantity} ед.`,t.incomplete?`По позициям с известной ценой получается ${money(t.amount)}. Полную стоимость прошу уточнить.`:`По каталогу стоимость цветов получается ${money(t.amount)} без доставки.`,'',`Доставка нужна по адресу: ${c.address}`,`Мой телефон: ${c.phone}`,...(c.comment?['',`Пожелания к заказу: ${c.comment}`]:[]),'','Подскажите, пожалуйста, доступны ли выбранные сорта, какие условия заказа и сколько будет стоить доставка.','Спасибо!','',`Мой заказ из тестового каталога: ${order.number}`,`Подготовлен: ${when} (МСК)`].join('\n');
  }
  return {money,step,validQty,known,restore,lines,totals,validate,clean,fingerprint,prepare,message};
});
