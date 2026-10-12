(() => {
  'use strict';
  const C=window.OrderCore,D=window.TelegramDelivery,products=window.CATALOG_DATA.products;
  const byRow=new Map(products.map(p=>[p.row,p]));
  const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let cart={},selected={},limit=24,prepared=null,preparedText='',route='catalog',catalogScroll=0,noticeTimer;
  try{cart=C.restore(localStorage.getItem('vc-cart-v1'),products);}catch{}
  const items=()=>C.lines(cart,products);
  const contact=()=>Object.fromEntries(['name','phone','address','comment'].map(k=>[k,$(k).value]));
  const variant=p=>[p.size?`Размер: ${escape(p.size)}`:'Размер материала уточнит менеджер',p.box?`Ящик: ${p.box} ${p.unit}`:'',p.portion?`Порция: ${p.portion} ${p.unit}`:'Порцию уточнит менеджер',p.relatedRows?.length?`То же фото у строки №${p.relatedRows.join(', №')}. Сверьте название и цену.`:''].filter(Boolean).join('<br>');
  const cost=p=>C.known(p)?`${C.money(p.price)} <span>за 1 ${p.unit}</span>`:'Уточнит менеджер';
  const image=(p,cls='')=>`<img class="${cls}" src="${p.photo}" alt="${escape(p.name)}" loading="lazy" decoding="async" width="640" height="640">`;
  function announce(text){$('announcement').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('announcement').textContent='',5000);}
  function save(){try{localStorage.setItem('vc-cart-v1',JSON.stringify(cart));}catch{announce('В этом браузере корзина не сохраняется после обновления страницы.');}updateCount();invalidate();}
  function updateCount(){const t=C.totals(items());$('cart-count').textContent=t.quantity;$('cart-nav').setAttribute('aria-label',`Корзина: ${t.quantity} единиц, ${items().length} позиций`);}
  function invalidate(){if(prepared){prepared=null;preparedText='';$('prepared').hidden=true;$('message-text').value='';$('delivery-status').textContent='';$('prepare').textContent='Проверить и подготовить заказ';}}
  function quantity(p,q,scope){return `<div class="quantity"><button class="secondary" data-action="minus" data-scope="${scope}" data-row="${p.row}" aria-label="Уменьшить количество ${escape(p.name)}" ${q<=C.step(p)?'disabled':''}>−</button><output aria-live="polite" aria-label="Количество ${escape(p.name)}" id="qty-${scope}-${p.row}">${q}</output><button class="secondary" data-action="plus" data-scope="${scope}" data-row="${p.row}" aria-label="Увеличить количество ${escape(p.name)}" ${q+C.step(p)>100000?'disabled':''}>+</button></div>`;}
  function selectionText(p,q){return `${q} ${p.unit}${p.portion?` · ${q/p.portion} порц.`:''} · ${C.known(p)?C.money(p.price*q):'стоимость уточнит менеджер'}`;}
  function productCard(p){const q=selected[p.row]||C.step(p);return `<article class="product" id="product-${p.row}"><button class="photo-button" data-action="photo" data-row="${p.row}" aria-label="Открыть крупное фото ${escape(p.name)}">${image(p)}<span class="photo-label">Увеличить фото</span></button><div class="product-body"><h3>${escape(p.name)}</h3><p class="row-label">Строка №${p.row}</p><p class="price">${cost(p)}</p><p class="details">${variant(p)}</p><div class="selector-label" id="label-${p.row}">Количество, ${p.unit}</div>${quantity(p,q,'catalog')}<p class="selection-total" id="selection-${p.row}">${selectionText(p,q)}</p><button class="primary add" data-action="add" data-row="${p.row}">Добавить в корзину</button><p class="added-note" id="added-${p.row}">${cart[p.row]?`В корзине: ${cart[p.row]} ${p.unit}`:''}</p></div></article>`;}
  function renderCatalog(){const query=$('search').value.trim().toLocaleLowerCase('ru');const found=products.filter(p=>p.name.toLocaleLowerCase('ru').includes(query)||String(p.row).includes(query));
    $('catalog-grid').innerHTML=found.slice(0,limit).map(productCard).join('');$('results-count').textContent=query?`Найдено: ${found.length} из ${products.length}`:`${products.length} сортов · порции по 2 или 5 единиц`;
    $('no-results').hidden=found.length>0;$('load-more').hidden=limit>=found.length;$('shown-count').textContent=found.length?`Показано ${Math.min(limit,found.length)} из ${found.length}`:'';
  }
  function summary(){const t=C.totals(items());return `<div class="totals"><p>Всего: ${t.quantity} ед. · ${items().length} позиций</p><strong>${t.incomplete?'Сумма известных позиций':'Стоимость товаров'}: ${C.money(t.amount)}</strong>${t.incomplete?'<p class="notice">Расчёт неполный: цену или порцию части товаров уточнит менеджер.</p>':''}<p class="muted">Доставка и окончательные условия подтверждаются менеджером. Наличие не гарантировано.</p></div>`;}
  function lineHTML(x,editable){const p=x.product;return `<article class="cart-item">${image(p)}<div><h3>${escape(p.name)}</h3><p class="row-label">Строка №${p.row}</p><p class="details">${variant(p)}</p><p>${C.known(p)?C.money(p.price)+' за 1 '+p.unit:'Цену уточнит менеджер'}</p><p><strong>${x.quantity} ${p.unit} · ${x.total===null?'Сумму уточнит менеджер':C.money(x.total)}</strong></p>${editable?`<div class="cart-controls">${quantity(p,x.quantity,'cart')}<button class="secondary remove" data-action="remove" data-row="${p.row}">Удалить <span class="sr-only">${escape(p.name)}</span></button></div>`:''}</div></article>`;}
  function renderCart(){if(!items().length){$('cart-content').innerHTML='<div class="empty"><h2>Пока здесь нет цветов</h2><p>Выберите георгины в каталоге, и они появятся здесь.</p><button class="primary" data-route="catalog">Вернуться к выбору</button></div>';return;}
    $('cart-content').innerHTML=items().map(x=>lineHTML(x,true)).join('')+summary()+'<button class="primary" data-route="checkout">Перейти к оформлению</button>';
  }
  function renderCheckout(){if(!items().length){go('cart');return;}$('checkout-items').innerHTML='<h2>Вы выбрали</h2>'+items().map(x=>lineHTML(x,false)).join('')+summary();}
  function go(next){if(route==='catalog')catalogScroll=window.scrollY;history.pushState(null,'','#'+next);showRoute(next);}
  function showRoute(next){next=['catalog','cart','checkout'].includes(next)?next:'catalog';if(next==='checkout'&&!items().length)next='cart';const changed=next!==route;route=next;
    for(const r of ['catalog','cart','checkout'])$(r+'-view').hidden=r!==next;
    if(next==='cart')renderCart();if(next==='checkout')renderCheckout();if(next==='catalog')renderCatalog();
    if(changed){$('announcement').textContent='';clearTimeout(noticeTimer);window.scrollTo(0,next==='catalog'?catalogScroll:0);$('main').focus({preventScroll:true});}
  }
  $('search').addEventListener('input',()=>{limit=24;renderCatalog();});
  function reset(){ $('search').value='';limit=24;renderCatalog();$('search').focus(); }
  $('clear-search').addEventListener('click',reset);$('reset-search').addEventListener('click',reset);
  $('load-more').addEventListener('click',()=>{const previous=limit;limit+=24;renderCatalog();$('catalog-grid').children[previous]?.querySelector('button')?.focus();});
  $('cart-nav').addEventListener('click',()=>go('cart'));
  const restoreRoute=()=>{const next=location.hash.slice(1)||'catalog';if(next!==route)showRoute(next);};
  window.addEventListener('hashchange',restoreRoute);window.addEventListener('popstate',restoreRoute);
  document.addEventListener('click',e=>{const button=e.target.closest('[data-action],[data-route]');if(!button)return;if(button.dataset.route){go(button.dataset.route);return;}
    const p=byRow.get(Number(button.dataset.row));if(!p)return;const action=button.dataset.action,scope=button.dataset.scope;
    if(action==='photo'){openPhoto(p);return;}
    if(action==='add'){const q=(cart[p.row]||0)+(selected[p.row]||C.step(p));if(!C.validQty(p,q)){announce('Слишком большое количество. Уточните заказ у менеджера.');return;}cart[p.row]=q;save();$('added-'+p.row).textContent=`В корзине: ${q} ${p.unit}`;announce(`Добавлено: ${p.name}, ${selected[p.row]||C.step(p)} ${p.unit}`);return;}
    if(action==='remove'){const index=items().findIndex(x=>x.product.row===p.row);delete cart[p.row];save();renderCart();const rows=$('cart-content').querySelectorAll('.cart-item');(rows[Math.min(index,rows.length-1)]?.querySelector('button')||$('cart-content').querySelector('button'))?.focus();announce(`${p.name} удалён из корзины.`);return;}
    const current=scope==='cart'?cart[p.row]:selected[p.row]||C.step(p),q=current+(action==='plus'?1:-1)*C.step(p);if(!C.validQty(p,q))return;
    if(scope==='cart'){cart[p.row]=q;save();renderCart();const target=$('cart-content').querySelector(`[data-action="${action}"][data-row="${p.row}"]`);(target?.disabled?target.parentElement.querySelector('[data-action="plus"]'):target)?.focus();}
    else{selected[p.row]=q;$('qty-catalog-'+p.row).textContent=q;$('selection-'+p.row).textContent=selectionText(p,q);const parent=button.parentElement;parent.querySelector('[data-action="minus"]').disabled=q<=C.step(p);parent.querySelector('[data-action="plus"]').disabled=q+C.step(p)>100000;if(button.disabled)parent.querySelector('[data-action="plus"]').focus();}
  });
  document.addEventListener('error',e=>{if(e.target.tagName!=='IMG')return;const img=e.target;if(img.id==='large-photo'){img.hidden=true;$('photo-fallback').hidden=false;return;}const fallback=document.createElement('span');fallback.className='photo-placeholder';fallback.textContent='Фото временно недоступно';fallback.setAttribute('role','img');fallback.setAttribute('aria-label',img.alt+': фото недоступно');img.replaceWith(fallback);},true);
  function openPhoto(p){$('photo-title').textContent=p.name+' · Строка №'+p.row;$('large-photo').hidden=false;$('photo-fallback').hidden=true;$('large-photo').alt=p.name;$('large-photo').src=p.largePhoto;$('photo-dialog').showModal();$('close-photo').focus();}
  $('close-photo').addEventListener('click',()=>$('photo-dialog').close());$('photo-dialog').addEventListener('click',e=>{if(e.target===$('photo-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  for(const key of ['name','phone','address','comment'])$(key).addEventListener('input',()=>{invalidate();if(key!=='comment'){$(key).removeAttribute('aria-invalid');$(key+'-error').hidden=true;}});
  $('contact-form').addEventListener('submit',e=>{e.preventDefault();if(!items().length){go('cart');return;}const c=contact(),errors=C.validate(c);
    for(const key of ['name','phone','address']){const invalid=!!errors[key];$(key).setAttribute('aria-invalid',String(invalid));$(key+'-error').hidden=!invalid;$(key+'-error').textContent=errors[key]||'';}
    if(Object.keys(errors).length){$(Object.keys(errors)[0]).focus();return;}
    prepared=C.prepare(items(),c,prepared,()=>crypto.randomUUID(),()=>new Date().toISOString());preparedText=C.message(items(),c,prepared);
    const cc=C.clean(c);$('review').innerHTML=`<p><strong>${escape(prepared.number)}</strong></p><dl><dt>Имя</dt><dd>${escape(cc.name)}</dd><dt>Телефон</dt><dd>${escape(cc.phone)}</dd><dt>Адрес</dt><dd>${escape(cc.address)}</dd>${cc.comment?`<dt>Комментарий</dt><dd>${escape(cc.comment)}</dd>`:''}</dl>`+summary();$('message-text').value=preparedText;
    const long=D.link(preparedText).tooLong;$('long-message').hidden=!long;$('send-order').textContent='Отправить заказ менеджеру';$('prepared').hidden=false;$('prepare').textContent='Проверить заказ ещё раз';$('prepared-title').focus();$('prepared').scrollIntoView({block:'start'});
  });
  function currentPrepared(){if(!prepared||prepared.fingerprint!==C.fingerprint(items(),contact())){invalidate();announce('Заказ изменился. Проверьте и подготовьте его ещё раз.');return false;}return true;}
  function manualCopy(){ $('full-text').open=true;$('message-text').focus();$('message-text').select();$('delivery-status').textContent='Выделен полный текст. Скопируйте его через меню браузера или Ctrl+C, затем откройте чат менеджера.';}
  $('copy-order').addEventListener('click',async()=>{if(!currentPrepared())return;const text=preparedText;if(await D.copy(text))$('delivery-status').textContent='Текст заказа скопирован. Вставьте его в чат менеджера и нажмите «Отправить».';else manualCopy();});
  $('select-text').addEventListener('click',manualCopy);
  $('send-order').addEventListener('click',async()=>{if(!currentPrepared())return;if(D.link(preparedText).tooLong){manualCopy();if(await D.copy(preparedText))$('delivery-status').textContent='Полный заказ скопирован. Откройте чат менеджера кнопкой ниже, вставьте текст и нажмите «Отправить».';return;}
    D.open(preparedText);$('delivery-status').textContent='Открыта ссылка Telegram. Проверьте текст в переписке и нажмите «Отправить». Если переход не сработал, скопируйте заказ и откройте чат менеджера.';
  });
  window.addEventListener('storage',e=>{if(e.key==='vc-cart-v1'){cart=C.restore(e.newValue,products);invalidate();updateCount();showRoute(route);announce('Корзина обновлена в другой вкладке. Проверьте её состав.');}});
  updateCount();showRoute(location.hash.slice(1)||'catalog');
})();
