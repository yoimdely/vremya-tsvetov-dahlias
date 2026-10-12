// Delivery adapter only. No server calls, credentials or automatic messaging.
window.TelegramDelivery={
  chatURL:'https://t.me/ekaterins_voloshina',
  link(text){const url=this.chatURL+'?text='+encodeURIComponent(text);return {url,tooLong:url.length>7000};},
  open(text){const result=this.link(text);if(result.tooLong)return false;window.open(result.url,'_blank','noopener,noreferrer');return true;},
  async copy(text){if(!navigator.clipboard?.writeText)return false;try{await navigator.clipboard.writeText(text);return true;}catch{return false;}}
};
