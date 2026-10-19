import rules from '../../shared/rules.json';
import samples from '../../shared/samples.json';
export {rules};
export type BenefitId = 'rent'|'housing'|'pension'|'card'|'sme'|'isa';
export type Field = keyof typeof rules.fields;
export type Profile = Record<Field, boolean|number|string|null>;
export interface Transaction {id:string;expenseId:string;date:string;amount:number;category:'transfer'|'rent'|'general'|'special'|'excluded';method:'transfer'|'credit'|'debit'|'cash';counterparty:string;cancelled:boolean}
export interface Contract {monthlyRent:number|null;startDate:string|null;endDate:string|null;confirmedByUser:true;inputOrigin:'ocr'|'manual'}
export interface Input {taxYear:number;asOfDate:string;profile:Profile;transactions:Transaction[];appliedBenefits:BenefitId[];consent:boolean;contract?:Contract|null}
export interface Plan {benefitId:BenefitId;status:'preparing'|'done'|'deferred'|'recheck';checked:boolean[];due:string|null;kind:'documents'|'contribution';amount:number|null}
export interface State {input:Input;plans:Plan[];reminders:string[]}
export type Eligibility = 'needs_info'|'candidate'|'ineligible'|'review_required';
export const labels:Record<Eligibility,string>={needs_info:'확인 필요',candidate:'적용 가능 후보',ineligible:'표준 요건 불충족',review_required:'검토 필요'};
export const sample=(id:keyof typeof samples):Input=>structuredClone(samples[id]) as Input;
const L=rules.limits,R=rules.rates;
const number=(p:Profile,key:Field)=>p[key] as number;
export const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function validateInput(data:Input){
 if(!data||typeof data!=='object'||!Number.isInteger(data.taxYear)||data.taxYear<2000||data.taxYear>2100||!validDate(data.asOfDate)||typeof data.consent!=='boolean')throw Error('연도·기준일·동의를 확인하세요.');
 if(!data.profile||Object.keys(data.profile).some(k=>!(k in rules.fields)))throw Error('알 수 없는 프로필 필드입니다.');
 for(const [key,def] of Object.entries(rules.fields)){
  const value=data.profile[key as Field];
  if(value===null)continue;
  if(def.type==='money'&&!(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=1e12))throw Error(`${def.label}: 0 이상의 정수 또는 미확인 값을 입력하세요.`);
  if(def.type==='boolean'&&typeof value!=='boolean')throw Error(`${def.label}: 응답을 확인하세요.`);
  if(def.type==='income'&&!['employment','none','mixed'].includes(String(value)))throw Error('소득 종류를 확인하세요.');
 }
 if(!Array.isArray(data.appliedBenefits)||data.appliedBenefits.length>6||data.appliedBenefits.some(b=>!rules.benefits.some(r=>r.id===b)))throw Error('기적용 혜택을 확인하세요.');
 if(data.contract){const c=data.contract;if(c.confirmedByUser!==true||!['ocr','manual'].includes(c.inputOrigin)||c.monthlyRent!==null&&(!Number.isSafeInteger(c.monthlyRent)||c.monthlyRent<0||c.monthlyRent>1e12)||c.startDate!==null&&!validDate(c.startDate)||c.endDate!==null&&!validDate(c.endDate)||c.startDate&&c.endDate&&c.startDate>c.endDate)throw Error('계약 초안의 금액·기간을 확인하세요.')}
 if(!Array.isArray(data.transactions)||data.transactions.length>3000)throw Error('내역은 최대 3,000건입니다.');
 for(const t of data.transactions){
  if(!t||Object.keys(t).sort().join(',')!=='amount,cancelled,category,counterparty,date,expenseId,id,method'||!/^[A-Za-z0-9_-]{1,80}$/.test(t.id)||!/^[A-Za-z0-9_-]{1,80}$/.test(t.expenseId)||!validDate(t.date)||!Number.isSafeInteger(t.amount)||t.amount<0||t.amount>1e12||!['transfer','rent','general','special','excluded'].includes(t.category)||!['transfer','credit','debit','cash'].includes(t.method)||typeof t.counterparty!=='string'||!t.counterparty.length||t.counterparty.length>60||typeof t.cancelled!=='boolean')throw Error('거래 ID·지출 ID·날짜·금액·분류·결제수단을 확인하세요.');
 }
 return data;
}
export function transactions(data:Input){
 const byId=new Map<string,Transaction>(),conflicts=new Set<string>();
 for(const row of data.transactions){const old=byId.get(row.id);if(old&&!row.cancelled&&!old.cancelled&&(['expenseId','date','amount','category','method','counterparty'] as const).some(k=>old[k]!==row[k]))conflicts.add(row.id);byId.set(row.id,row)}
 const cancelled=new Set(data.transactions.filter(r=>r.cancelled).map(r=>r.expenseId)),byExpense=new Map<string,Transaction>();
 for(const row of byId.values()){
  if(row.date.slice(0,4)!==String(data.taxYear)||cancelled.has(row.expenseId))continue;
  const old=byExpense.get(row.expenseId);if(old&&(old.amount!==row.amount||old.date!==row.date))conflicts.add(row.expenseId);
  if(!old||row.method==='transfer')byExpense.set(row.expenseId,row);
 }
 const rows=[...byExpense.values()],groups=new Map<string,Transaction[]>();
 for(const r of rows)if(['rent','transfer'].includes(r.category)&&r.method==='transfer'){const key=JSON.stringify([r.counterparty,r.amount]);groups.set(key,[...(groups.get(key)||[]),r])}
 const rent=[...groups.values()].filter(g=>new Set(g.map(r=>r.date.slice(0,7))).size>=3).flat();
 const receipts=new Set([...byId.values()].filter(r=>r.method==='cash'&&!r.cancelled).map(r=>r.expenseId));
 return {rows,rent,conflicts:[...conflicts].sort(),rentReceiptIds:rent.filter(r=>receipts.has(r.expenseId)).map(r=>r.expenseId).sort(),removed:data.transactions.length-rows.length,specialCount:rows.filter(r=>r.category==='special').length};
}
function pension(p:Profile,extra=0){return Math.floor(Math.min(Math.min(number(p,'pensionPaid')+extra,L.pension)+number(p,'irpPaid'),L.pensionCombined)*(number(p,'grossSalary')<=L.lowSalary?R.pensionLow:R.pensionHigh)/100)}
export function cardAmount(salary:number,credit:number,debit:number){const threshold=Math.floor(salary*R.cardThreshold/100);return Math.min(Math.floor((Math.max(0,credit-threshold)*R.credit+Math.max(0,debit-Math.max(0,threshold-credit))*R.debit)/100),salary<=L.cardSalary?L.cardLowCap:L.cardHighCap)}
function cardTotals(data:Input,tx:ReturnType<typeof transactions>){const ids=new Set(tx.rent.map(r=>r.expenseId));let credit=0,debit=0;for(const r of tx.rows)if(r.category==='general'&&!ids.has(r.expenseId)){if(r.method==='credit')credit+=r.amount;if(['debit','cash'].includes(r.method))debit+=r.amount}if(data.profile.claimRent===false)debit+=tx.rent.filter(r=>tx.rentReceiptIds.includes(r.expenseId)).reduce((sum,r)=>sum+r.amount,0);return {credit,debit}}
export function diagnose(data:Input){
 let inputError='';try{validateInput(data)}catch(e){inputError=(e as Error).message}
 const p=data.profile,tx=transactions(data);
 const cards=rules.benefits.map(rule=>{
  const bid=rule.id as BenefitId,missing=rule.required.filter(k=>p[k as Field]===null) as Field[];
  let status:Eligibility='candidate',reason='입력 기준 적용 가능 후보입니다. 확정 판정·환급액이 아닙니다.';
  if(missing.length){status='needs_info';reason='판정에 필요한 정보를 확인해 주세요.'}
  for(const [key,expected,failure] of rule.conditions){const field=key as Field;if(p[field]!==null&&p[field]!==expected){status=failure as Eligibility;reason=rules.fields[field].label+' 조건을 충족하지 않거나 추가 확인이 필요합니다.';if(failure==='needs_info'&&!missing.includes(field))missing.push(field);break}}
  if(bid!=='isa'){
   if(p.incomeType==='none'||p.grossSalary===0){status='ineligible';reason='근로소득 전용 표준 계산을 적용하지 않습니다. 소득 확인·제도 정보만 안내합니다.'}
   else if(p.incomeType==='mixed'){status='review_required';reason='근로 외 소득이 있는 사례는 이 표준 계산 범위를 벗어나 전문 검토가 필요합니다.'}
  }
  if(bid==='rent'){
   if((p.grossSalary!==null&&number(p,'grossSalary')>L.rentSalary)||(p.aggregateIncome!==null&&number(p,'aggregateIncome')>L.rentIncome)){status='ineligible';reason='월세 소득 기준을 초과합니다.'}
   else if(status==='candidate'&&(tx.rent.length!==12||new Set(tx.rent.map(r=>r.date.slice(0,7))).size!==12)){status='review_required';reason='12개월 월세 후보를 확인하지 못했습니다. 부분 기간·변동 월세·여러 임대차는 별도 검토가 필요합니다.'}
  }
  if(bid==='housing'&&p.grossSalary!==null&&number(p,'grossSalary')>L.housingSalary){status='ineligible';reason='청약 소득공제 총급여 기준을 초과합니다.'}
  const contract=data.contract;
  if(bid==='rent'&&contract&&status==='candidate'){
   if(contract.monthlyRent!==null&&tx.rent.some(r=>r.amount!==contract.monthlyRent)){status='review_required';reason='확인한 계약서 월세와 이체 금액이 상충합니다. 관리비·계약 변경 여부를 확인하세요.'}
   if(contract.startDate&&contract.startDate>`${data.taxYear}-01-01`||contract.endDate&&contract.endDate<`${data.taxYear}-12-31`){status='review_required';reason='확인한 계약 기간이 연중 동일 임대차 표준 범위를 벗어납니다.'}
  }
  if(bid==='sme'&&status==='candidate'){status='review_required';reason='회사 업종·최초 적격 취업일·병역·기적용 여부를 확인해야 합니다. 급여만으로 감면액을 계산하지 않습니다.'}
  if(bid==='card'){
   if(tx.rentReceiptIds.length&&p.claimRent===null){status='needs_info';reason='같은 월세의 현금영수증이 있습니다. 월세 세액공제 적용 여부를 먼저 확인하세요.';if(!missing.includes('claimRent'))missing.push('claimRent')}
   if(tx.specialCount&&status==='candidate'){status='review_required';reason='전통시장·교통·문화체육 등 특수 사용분이 있어 일반 사용분만으로 전체 공제를 확정할 수 없습니다.'}
  }
  if(tx.conflicts.length&&['rent','card'].includes(bid)){status='review_required';reason='같은 거래 또는 지출의 금액·날짜가 상충합니다. 원자료를 확인해 주세요.'}
  if(data.taxYear!==rules.taxYear){status='review_required';reason='선택한 귀속연도의 규칙이 없습니다. 기존 연도 결과를 재사용하지 않습니다.'}
  if(!data.consent){status='needs_info';reason='가상 자료 이용 동의가 필요합니다.'}
  if(inputError){status='review_required';reason=inputError}
  let amount:number|null=null,formula='정보 확인 후 지원 범위 안에서만 계산합니다.';
  if(status==='candidate'){
   if(bid==='rent'){const base=Math.min(tx.rent.reduce((s,r)=>s+r.amount,0),L.rent),rate=number(p,'grossSalary')<=L.lowSalary&&number(p,'aggregateIncome')<=L.lowIncome?R.rentLow:R.rentHigh;amount=Math.floor(base*rate/100);formula=`min(확인 월세, ${L.rent.toLocaleString('en-US')}원) × ${rate}%`}
   else if(bid==='housing'){amount=Math.max(0,Math.min(Math.floor(Math.min(number(p,'housingPaid'),L.housing)*R.housing/100),L.housingShared-number(p,'loanDeduction')));formula='min(납입액 300만원 한도 × 40%, 전세대출과 공유하는 400만원 잔여 한도)'}
   else if(bid==='pension'){amount=pension(p);formula='min(min(연금저축, 600만원) + IRP·DC, 900만원) × 국세 공제율'}
   else if(bid==='card'){const {credit,debit}=cardTotals(data,tx);amount=cardAmount(number(p,'grossSalary'),credit,debit);formula=`일반 신용 ${credit.toLocaleString('en-US')}원 / 체크·현금 ${debit.toLocaleString('en-US')}원 → 총급여 25% 차감 후 15%·30%, 기본 한도 적용`}
   else if(bid==='isa'){formula='비과세 한도 안내만 제공. 수익·가입 유형 미확정으로 예상 절세액을 계산하지 않습니다.';if(p.isaHeld)reason='기존 ISA를 확인하세요. 중복 개설을 권하지 않습니다.'}
  }
  return {...rule,id:bid,benefitId:bid,taxYear:data.taxYear,eligibility:status,availability:bid==='isa'?'unknown':'open',actionStatus:'not_started',missingFields:missing,amount,formula,reason,alreadyApplied:data.appliedBenefits.includes(bid),ruleVersion:rules.version,verifiedAt:rules.verifiedAt,isDemo:true};
 });
 const questions=data.consent&&data.taxYear===rules.taxYear?[...new Set(cards.filter(c=>c.eligibility==='needs_info').flatMap(c=>c.missingFields))].slice(0,3):[];
 return {cards,questions,ruleVersion:rules.version,taxYear:data.taxYear,evidence:data.consent?tx:{rows:[],rent:[],conflicts:[],rentReceiptIds:[],removed:0,specialCount:0},trace:data.consent?['get_profile','get_transactions','find_candidates','evaluate_benefit','get_official_sources']:[]};
}
export type Analysis=ReturnType<typeof diagnose>;
export function scenario(data:Input,kind:'pension'|'card',amount:number){
 const card=diagnose(data).cards.find(c=>c.id===kind)!,p=data.profile;
 const result={before:null as number|null,after:null as number|null,delta:null as number|null,amountType:card.amountType,unit:card.unit,canSave:false,reason:card.reason,taxYear:data.taxYear,ruleVersion:rules.version};
 if(card.eligibility!=='candidate')return result;
 if(!Number.isSafeInteger(amount)||amount<0||amount>1e12)return {...result,reason:'비교 금액을 확인하세요.'};
 let before:number,after:number,reason:string;
 if(kind==='pension'){
  if(p.budget===null||p.liquid!==true||amount>number(p,'budget')||amount<=0)return {...result,reason:'생활비 제외 여부와 가용 예산을 확인하세요. 예산 초과·0원 납입 과제는 저장하지 않습니다.'};
  before=pension(p);after=pension(p,amount);reason='국세 계산액 차이이며 실제 환급액이 아닙니다. 장기 유지·중도인출 조건과 실제 납입 한도는 금융기관에서 확인하세요.';
 }else{const {credit,debit}=cardTotals(data,transactions(data));before=cardAmount(number(p,'grossSalary'),credit+amount,debit);after=cardAmount(number(p,'grossSalary'),credit,debit+amount);reason='같은 예정 소비를 신용 또는 체크로 결제하는 비교입니다. 추가 소비를 권하지 않습니다.'}
 return {...result,before,after,delta:after-before,canSave:kind==='pension'&&after>before,reason};
}
export function changeInput(state:State,input:Input):State{return {...state,input,plans:state.plans.map(p=>({...p,status:'recheck',checked:[false,false,false]}))}}
export function catalogStatus(item:typeof rules.catalog[number],date:string){if(item.status!=='dated')return item.status;if(!validDate(date)||date.slice(0,4)!=='2026')return 'unknown';return date<item.start!?'upcoming':date>item.end!?'closed':'open'}
export function templateReply(data:Input,id:BenefitId,message:string){const card=diagnose(data).cards.find(c=>c.id===id)!;const match=message.match(/(\d[\d,]*)\s*(만원|원)/);if(match&&(id==='pension'||message.includes('연금'))){const result=scenario(data,'pension',Number(match[1].replaceAll(',',''))*(match[2]==='만원'?10000:1));return result.reason+(result.delta!==null?` 국세 계산액 차이는 ${result.delta.toLocaleString('ko-KR')}원입니다.`:'')}return /왜|근거|가능/.test(message)?`${card.reason} ${card.formula} ${card.amount===null?'':`${card.unit}: ${card.amount.toLocaleString('ko-KR')}원. 확정 환급액 아님.`}`:/다음|할 일|준비|저장/.test(message)?card.nextAction:/수정|변경|주소/.test(message)?'입력 또는 아래 확인 질문에서 수정하세요. 결과를 다시 계산하고 할 일을 재확인합니다.':'지원 범위 밖의 제도·세율은 공식 자료 확인이 필요합니다. 현재 혜택의 근거·다음 행동·정보 수정을 질문해 주세요.'}

export function importTransactions(text:string,filename:string,input:Input):Transaction[]{
 let rows:Transaction[];
 if(filename.toLowerCase().endsWith('.json'))rows=JSON.parse(text.replace(/^\uFEFF/,''));
 else{
  const lines:string[][]=[];let row:string[]=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(field);field=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))lines.push(row);row=[];field=''}else field+=ch}
  if(quoted)throw Error('CSV 따옴표가 닫히지 않았습니다.');row.push(field);if(row.some(Boolean))lines.push(row);
  const headers=lines.shift()?.map(s=>s.replace(/^\uFEFF/,'').trim());if(!headers||new Set(headers).size!==headers.length)throw Error('CSV 헤더를 확인하세요.');
  rows=lines.map(values=>{if(values.length!==headers.length)throw Error('CSV 열 개수가 다릅니다.');const entry=Object.fromEntries(headers.map((key,i)=>[key,values[i]]));if(!/^\d+$/.test(entry.amount)||!['true','false'].includes(entry.cancelled))throw Error('금액은 정수, cancelled는 true 또는 false여야 합니다.');return {...entry,amount:Number(entry.amount),cancelled:entry.cancelled==='true'} as unknown as Transaction});
 }
 validateInput({...input,transactions:rows});return rows;
}
