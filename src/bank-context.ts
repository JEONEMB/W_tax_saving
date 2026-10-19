import {answerQuestion,type Customer,type Benefit} from './domain';
import {isGrant,getGrant,updateGrant,type GrantKind} from './grants';

// Verified information in the fictional bank's customer records. External records
// below are a separate mock connector and are only read after scoped consent.
export function bankCustomer(c:Customer):Customer{
 return {...c,readConsent:true,answers:{eligible:'yes',...(c.id==='investor'?{invest:'stock'}:{}),...c.answers}};
}
export function bankFacts(c:Customer,b?:Benefit){
 const facts=[{label:'고객 확인',value:`${c.name} · 본인확인 완료`,source:'은행 고객정보'},
 {label:'입출금 잔액',value:`${c.cash.toLocaleString('ko-KR')}원`,source:'우리은행 계좌'}];
 const account=c.accounts.find(a=>a.kind===b);
 if(account)facts.push({label:account.name,value:`올해 납입 ${account.contributed.toLocaleString('ko-KR')}원`,source:account.provider?.startsWith('외부')||account.name.includes('중개형')?'연계 증권사 계좌정보':'우리은행 거래내역'});
 else if(b&&['pension','housing','isa'].includes(b))facts.push({label:'자행 계좌 조회',value:`해당 계좌 미보유`,source:'우리은행 계좌'});
 if(c.id==='renter')facts.push({label:'월세 후보',value:'매월 60만원 · 반복 이체 12건',source:'이체내역 · 고객 확인 전'});
 if(c.id==='investor')facts.push({label:'투자 성향',value:'국내 주식 직접 투자 선호',source:'기존 고객 상담 정보'});
 if(c.id==='grant-worker'||c.id==='grant-parent')facts.push({label:'급여 추정 입금',value:c.id==='grant-worker'?'2025년 1,620만원':'2025년 2,880만원',source:'입금내역 · 총소득과 별도'});
 return facts;
}
export function connectionSpec(b:Benefit){
 const specs={
  pension:{title:'타행 연금 납입을 확인할게요',purpose:'연금저축·IRP 중복 납입과 남은 공제 한도 확인',fields:'타 금융기관 연금계좌·해당 연도 납입액',keys:['otherPension']},
  housing:{title:'청약 보유·주거 조건을 확인할게요',purpose:'중복 개설 방지와 청약 소득공제 조건 확인',fields:'타행 청약 보유 여부·주택 소유·세대 정보',keys:['noHousing','homeless']},
  isa:{title:'ISA 가입 조건을 확인할게요',purpose:'기존 ISA 중복 가입 및 가입 제한 확인',fields:'타행 ISA 보유 여부·금융소득종합과세 이력',keys:['noIsa','isaEligible']},
  rent:{title:'월세 이체와 주거 자료를 대조할게요',purpose:'임대차 계약·등록 주소와 월세 이체내역 대조',fields:'가상 계약서·주민등록 주소·무주택·근로 기간',keys:['address','rentEligible','documents']},
  card:{title:'공제에 필요한 정보를 확인할게요',purpose:'사용액 공제 적용 범위 확인',fields:'가구·자녀 여부·공제대상 사용액',keys:['noChildren']},
  sme:{title:'회사 감면 신청 여부를 확인해 주세요',purpose:'대상 업종·최초 감면 취업일 확인',fields:'회사 담당자 확인 필요',keys:['company']},
 };
 return specs[isGrant(b)?'card':b];
}
export function connectFinancial(c:Customer,b:Benefit):Customer{
 if(isGrant(b)||b==='sme')return c;
 let next=answerQuestion(c,`connection:${b}`,'yes');
 for(const key of connectionSpec(b).keys){
  // The incomplete-information persona deliberately remains unresolved.
  const value=c.id==='unknown'||(b==='rent'&&c.id!=='renter')?'unknown':'yes';
  next=answerQuestion(next,key,value);
 }
 return next;
}
export function connectGrant(c:Customer,b:GrantKind):Customer{
 const d=getGrant(c,b);
 // Consent accesses separate, declared fictitious agency/MyData fixtures;
 // bank balances or salary credits never stand in for household totals.
 const fixture:Record<string,string>=c.id==='grant-worker'?{household:'single',incomeType:'earned',totalIncome:'18000000',assets:'100000000',assetCoverage:'complete',exclusions:'clear',already:'not',notice:'no'}:
 c.id==='grant-parent'?{household:'one',incomeType:'earned',totalIncome:'32000000',assets:'150000000',assetCoverage:'complete',exclusions:'clear',already:'not',notice:'no',childEligible:'yes'}:{};
 return updateGrant(c,b,{consent:true,answers:{...fixture,...d.answers},step:4});
}
