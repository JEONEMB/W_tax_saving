import {describe,it,expect} from 'vitest';
import {fixtures} from './domain';
import {recommendations} from './recommendations';
describe('personalized discovery',()=>{
 it('keeps each scenario focus first and returns distinct alternatives',()=>{
  for(const c of fixtures()){
   const list=recommendations(c);
   expect(list[0].benefit).toBe(c.focus);
   expect(new Set(list.map(x=>x.benefit)).size).toBe(3);
  }
 });
 it('reflects newly opened accounts and insufficient budgets without promising benefits',()=>{
  const c=fixtures()[1];c.budget=0;
  expect(recommendations(c)[0].status).toBe('예산·조건 확인 먼저');
  c.accounts.push({id:'new',kind:'pension',name:'연금',balance:0,contributed:0});
  expect(recommendations(c)[0].action).toBe('추가 납입안 확인');
 });
});
