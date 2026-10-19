import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {sample,diagnose,scenario,changeInput,importTransactions,catalogStatus,rules,type Input} from './engine';
const prepared=()=>{const data=sample('A');data.consent=true;data.profile.addressMatch=true;return data};
describe('MVP integrated rules',()=>{
 it('uses actual transactions and confirmed conditions',()=>{const d=prepared();expect(diagnose(d).cards[0].amount).toBe(1224000);for(const t of d.transactions)if(t.method==='transfer')t.amount=500000;expect(diagnose(d).cards[0].amount).toBe(1020000);d.profile.addressMatch=null;expect(diagnose(d).cards[0].amount).toBeNull()});
 it('preserves null and blocks invalid values',()=>{const d=prepared();d.profile.grossSalary=null;expect(diagnose(d).cards[0].amount).toBeNull();d.profile.grossSalary=-1;expect(diagnose(d).cards.every(c=>c.amount===null)).toBe(true)});
 it('compares pension within budget and general payment methods',()=>{const d=prepared();expect(scenario(d,'pension',2000000).delta).toBe(300000);expect(scenario(d,'card',1000000).delta).toBe(150000);d.profile.budget=0;expect(scenario(d,'pension',2000000).canSave).toBe(false)});
 it('separates closed applications from approved account opening',()=>{const item=rules.catalog.find(c=>c.id==='youth-future')!;expect(catalogStatus(item,'2026-10-06')).toBe('upcoming');expect(catalogStatus(item,'2026-10-07')).toBe('open');expect(catalogStatus(item,'2026-10-16')).toBe('open');expect(catalogStatus(item,'2026-10-17')).toBe('closed');expect(catalogStatus(item,'2026-11-16')).toBe('closed');expect(catalogStatus(item,'2027-10-17')).toBe('unknown');expect(catalogStatus(rules.catalog.find(c=>c.id==='youth-leap')!,'2026-10-17')).toBe('discontinued')});
 it('invalidates completed tasks on input changes',()=>{const data=prepared();const changed=changeInput({input:data,plans:[{benefitId:'rent',status:'done',checked:[true,true,true],due:null,kind:'documents',amount:null}],reminders:[]},{...data,taxYear:2025});expect(changed.plans[0].status).toBe('recheck');expect(changed.plans[0].checked).toEqual([false,false,false])});
 it('parses quoted CSV and rejects malformed imports before application',()=>{const csv='id,expenseId,date,amount,category,method,counterparty,cancelled\r\na,a,2026-01-01,12000,general,credit,"가상, 거래처",false';expect(importTransactions(csv,'a.csv',prepared())[0].counterparty).toBe('가상, 거래처');expect(()=>importTransactions(csv.replace('12000','NaN'),'a.csv',prepared())).toThrow();expect(()=>importTransactions('[{"amount":1}]','a.json',prepared())).toThrow()});
 it('deduplicates cash receipts and does not double count rent',()=>{const d=prepared();d.transactions.push({...d.transactions[0],id:'receipt',category:'general',method:'cash'});expect(diagnose(d).cards.find(c=>c.id==='card')?.amount).toBe(1200000);d.profile.claimRent=false;expect(diagnose(d).cards.find(c=>c.id==='card')?.amount).toBe(1380000)});
 it('matches Python server for changed input and exception fixtures',()=>{
  const inputs:Input[]=[prepared(),sample('B'),sample('C'),sample('manual')];
  for(const [key,value] of [['addressMatch',null],['budget',0],['noChildren',false],['otherPensionKnown',false],['grossSalary',80000001],['incomeType','mixed']] as const){const d=prepared();d.profile[key]=value;inputs.push(d)}
  const cancelled=prepared();cancelled.transactions[0].cancelled=true;inputs.push(cancelled);
  const conflict=prepared();conflict.transactions.push({...conflict.transactions[0],amount:100});inputs.push(conflict);
  const executable=existsSync('.venv/Scripts/python.exe')?'.venv/Scripts/python.exe':'.venv/bin/python';
  const result=spawnSync(executable,['-X','utf8','-c','import json,sys; from backend.engine import diagnose,scenario; print(json.dumps([{ "analysis":diagnose(d),"scenario":scenario(d,"pension",2000000)} for d in json.load(sys.stdin)],ensure_ascii=True))'],{input:JSON.stringify(inputs),encoding:'utf8'});
  expect(result.status,result.stderr).toBe(0);
  const results=JSON.parse(result.stdout);
  inputs.forEach((d,i)=>{expect(diagnose(d)).toEqual(results[i].analysis);expect(scenario(d,'pension',2000000)).toEqual(results[i].scenario)});
 });
});
