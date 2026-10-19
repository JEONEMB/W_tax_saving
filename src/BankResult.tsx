import {ArrowRight,Check,Clock,FileText,ShieldCheck,Wallet,X} from 'lucide-react';
import {type Action,type Customer,statusLabels,titles} from './domain';

const money=(n:number)=>`${n.toLocaleString('ko-KR')}원`;
// Stable masked display for fictional accounts; the UUID remains the record key.
function accountNumber(id:string,external:boolean){const suffix=String([...id].reduce((n,ch)=>(n*31+ch.charCodeAt(0))>>>0,0)%1000000).padStart(6,'0');return `${external?'•••-••':'1002-•••'}-${suffix}`;}
const date=(value:string)=>new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
export function actionStatus(a:Action){
 if(a.status!=='success')return statusLabels[a.status];
 return a.kind==='open'?'계좌 개설 완료':a.kind==='deposit'?'납입 완료':a.kind==='report'?'증빙 준비 완료':a.kind==='grant_submit'?'신청 접수 완료':'신청 준비 완료 · 접수 전';
}
export function ReceiptRows({rows}:{rows:[string,string][]}){
 return <dl className="receipt-rows">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
export default function BankResult({customer:c,action:a,onNavigate:go,onResolve,onRetry,onDownload}:{customer:Customer;action:Action;onNavigate:(route:string)=>void;onResolve:()=>void;onRetry:()=>void;onDownload:()=>void}){
 const success=a.status==='success',opening=a.kind==='open',report=a.kind==='report',external=a.provider.startsWith('외부');
 const account=c.accounts.find(x=>x.id===(a.receipt?.accountId||(opening?`SIM-${a.id.slice(0,8)}`:a.accountId)));
 const product=a.receipt?.productName||(a.benefit==='pension'?'우리 연금저축펀드':a.benefit==='housing'?'주택청약종합저축':account?.name||a.label.replace(' 개설',''));
 const provider=external?'외부 증권사': '우리은행';
 const accountId=a.receipt?.accountId||account?.id;
 const title=success?(opening?`${titles[a.benefit]} 개설 완료`:report?'월세 증빙 준비 완료':`${titles[a.benefit]} 납입 완료`):a.status==='unknown'?'처리 결과 확인 중':a.status==='cancelled'?'요청을 취소했어요':opening?'계좌가 개설되지 않았어요':'납입이 완료되지 않았어요';
 const amount=a.receipt?.balanceAfter??(opening?0:undefined);
 const rows:[string,string][]=[['예금주',c.name],['처리 기관',provider],[opening?'개설일시':'처리일시',date(a.receipt?.completedAt||a.created)],['신청 채널','WON뱅킹 · WEBEE']];
 if(success&&!report){
  if(opening)rows.push(['개설 시 입금액',money(a.amount)],['납입 상태',a.amount===0?'첫 납입 전':'납입 완료']);
  else {rows.push(['출금계좌','우리 WON통장 · 1002-•••-0821'],['납입 금액',money(a.amount)]);if(amount!==undefined)rows.push(['납입 후 계좌 잔액',money(amount)]);if(a.receipt)rows.push(['출금 후 잔액',money(a.receipt.cashAfter)]);}
 }
 if(report){rows.push(['귀속연도',`${c.year}년`],['준비 자료','월세 이체내역 · 계약·주소 확인'],['제출 상태','제출 전']);}
 return <section className="bank-result">
  <header className={`completion-heading ${success?'complete':a.status}`}><span className="completion-icon">{success?<Check size={34}/>:a.status==='unknown'?<Clock size={32}/>:<X size={32}/>}</span><span className="eyebrow">{report?'서류 준비 결과':opening?'계좌 개설 결과':'납입 처리 결과'}</span><h1>{title}</h1><p>{success?(opening?`${c.name}님의 새로운 계좌가 준비됐어요.`:report?'확인한 자료를 하나의 보고서로 정리했어요.':`${money(a.amount)}을 계좌에 납입했어요.`):a.status==='unknown'?'응답을 기다리고 있어요. 결과 조회로 이어서 확인해 주세요.':'계좌와 잔액은 변경되지 않았어요.'}</p></header>
  <article className="bank-receipt">
   <div className="receipt-product"><span className="receipt-product-icon">{report?<FileText size={24}/>:<Wallet size={24}/>}</span><div><small>{report?'연말정산 증빙':provider}</small><h2>{product}</h2></div><span className="receipt-badge">{actionStatus(a)}</span></div>
   {success&&!report&&<div className="receipt-account"><span>계좌번호 <small>체험용</small></span><strong>{accountId?accountNumber(accountId,external):'이전 실행내역 · 번호 확인 필요'}</strong>{opening&&<p>개설 시 잔액 <b>{money(amount??0)}</b></p>}</div>}
   <ReceiptRows rows={rows}/>
   <div className="receipt-reference">거래번호 <span>{a.id.slice(0,8).toUpperCase()}</span></div>
  </article>
  {success&&<div className="result-next"><ShieldCheck size={19}/><p>{report?'회사 연말정산 또는 홈택스 제출 시 자료를 확인해 주세요.':opening?(a.benefit==='isa'?'ISA 유형에 맞는 금융기관에서 납입과 운용을 이어갈 수 있어요.':a.benefit==='housing'?'첫 납입을 진행하면 청약 저축을 시작할 수 있어요.':'이 계좌에 납입하면 연금 준비를 시작할 수 있어요. 펀드 매수는 별도예요.'):'납입 내역을 반영했어요. 공제 적용은 연간 납입액과 요건에 따라 달라져요.'}</p></div>}
  <div className="result-buttons">
   {success&&opening&&a.benefit!=='isa'&&<button className="primary" onClick={()=>go(`benefit/${a.benefit}`)}>이 계좌에 납입하기<ArrowRight size={18}/></button>}
   {success&&report&&<button className="primary" onClick={onDownload}>샘플 보고서 다운로드</button>}
   {a.status==='unknown'&&<button className="primary" onClick={onResolve}>실행 결과 조회</button>}
   {a.status==='failed'&&<button className="primary" onClick={onRetry}>{opening?'개설 다시 준비하기':'납입 다시 준비하기'}</button>}
   <button className={success&&!report&&(!opening||a.benefit==='isa')?'primary':'secondary'} onClick={()=>go('home')}>자산 현황 확인</button>
   <button className="text-button" onClick={()=>go('history')}>거래내역 보기</button>
  </div>
  <p className="result-demo-note">체험용 거래 결과 · 실제 계좌 개설·입출금·증명서 발급은 이루어지지 않습니다.</p>
 </section>;
}
