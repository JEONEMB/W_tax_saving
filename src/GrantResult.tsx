import {Check,Clock,FileText,X} from 'lucide-react';
import type {Action,Customer} from './domain';
import {bankGrantData,GRANT_TITLES,type GrantKind} from './grants';
import {ReceiptRows} from './BankResult';

export default function GrantResult({customer:c,benefit:b,receipt:a,onDownload,onResolve,onRetry,onNavigate:go}:{customer:Customer;benefit:GrantKind;receipt:Action;onDownload:()=>void;onResolve:()=>void;onRetry:()=>void;onNavigate:(route:string)=>void}){
 const success=a.status==='success',pending=a.status==='unknown';
 return <section className="bank-result grant-receipt">
  <header className={`completion-heading ${success?'complete':a.status}`}><span className="completion-icon">{success?<Check size={34}/>:pending?<Clock size={32}/>:<X size={32}/>}</span><span className="eyebrow">국세청 · 홈택스 신청</span><h1>{success?`${GRANT_TITLES[b]} 신청 접수 완료`:pending?'접수 결과를 확인하고 있어요':'신청이 접수되지 않았어요'}</h1><p>{success?`${c.name}님의 신청 내용을 접수했어요. 심사 결과에 따라 지급 여부와 금액이 결정돼요.`:pending?'응답을 확인 중이에요. 다시 신청하지 않고 결과를 조회해 주세요.':'신청 내용을 확인한 후 다시 진행해 주세요.'}</p></header>
  <article className="bank-receipt"><div className="receipt-product"><span className="receipt-product-icon"><FileText size={24}/></span><div><small>2025년 소득분</small><h2>{GRANT_TITLES[b]} 신청</h2></div><span className="receipt-badge">{success?'접수 완료':pending?'접수 확인 중':'미접수'}</span></div>
   <div className="receipt-account"><span>{success?'접수번호':'요청번호'} <small>체험용</small></span><strong>SIM-{a.id.slice(0,8).toUpperCase()}</strong></div>
   <ReceiptRows rows={[[ '신청인',c.name],['신청 기관','국세청 · 홈택스'],['신청일시',new Date(a.created).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})],['소득 귀속연도','2025년'],['수령계좌',bankGrantData(c).account],['처리 상태',success?'접수 완료 · 심사 대기':pending?'접수 응답 확인 중':'미접수'],['지급 예정액','심사 후 결정']]}/>
   {success&&<ol className="application-progress" aria-label="신청 처리 단계"><li><b>1</b>접수 완료</li><li><b>2</b>심사 대기</li><li><b>3</b>지급 결정 전</li></ol>}
  </article>
  <div className="result-buttons">{success&&<button className="primary" onClick={onDownload}>접수 내역 내려받기</button>}{pending&&<button className="primary" onClick={onResolve}>접수 결과 조회</button>}{a.status==='failed'&&<button className="primary" onClick={onRetry}>신청 내용 다시 확인</button>}<button className="secondary" onClick={()=>go('history')}>실행내역 보기</button><button className="text-button" onClick={()=>go('home')}>홈으로</button></div>
  <p className="result-demo-note">시연용 접수 결과입니다. 실제 국세청에 전송되거나 접수된 신청은 없습니다.</p>
 </section>;
}
