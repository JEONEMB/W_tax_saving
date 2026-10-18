import {fixtures,type Customer} from './domain';

// Add new demo profiles without resetting earlier accounts, answers or receipts.
export function restoreCustomers(raw:string|null):Customer[]{
 const defaults=fixtures();
 try{
  const saved=JSON.parse(raw||'null');
  if(saved?.version!==1||!Array.isArray(saved.customers))return defaults;
  return defaults.map(base=>{
   const existing=saved.customers.find((c:Customer)=>c?.id===base.id);
   if(!existing||!Array.isArray(existing.accounts)||!Array.isArray(existing.actions)||!existing.answers||typeof existing.answers!=='object')return base;
   return {...base,...existing};
  });
 }catch{return defaults}
}
