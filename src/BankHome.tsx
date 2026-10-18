import {ArrowRight,ChevronRight,Wallet,ShieldCheck,Plus,ChevronDown,Eye,EyeOff} from 'lucide-react';
import {useState} from 'react';
import {type Customer} from './domain';
export function WonSymbol(){return <span className="won-symbol" aria-hidden="true"><span/><i/></span>}
export default function BankHome({customer:c,onNavigate:go,onSelect}:{customer:Customer;onNavigate:(route:string)=>void;onSelect:()=>void}){
 const [hidden,setHidden]=useState(false);
 const cash=hidden?'•••,•••,•••':c.cash.toLocaleString('ko-KR');
 return <>
 <section className="bank-welcome hero-card">
   <div className="welcome-visual"><div className="glass-tile"><WonSymbol/></div><span className="visual-halo"/></div>
   <p className="welcome-eyebrow">내 금융을 이해하는 절세 Agent</p>
   <h1>내 모든 금융생활의 중심<br/>우리 WON <span>세금비서</span></h1>
   <p className="welcome-description">나에게 맞는 절세·지원 혜택을 찾고<br/>동의한 실행까지 함께해요.</p>
   <div className="welcome-dots" aria-hidden="true"><b/><i/><i/></div>
   <button className="primary welcome-start" aria-label="나의 절세 기회 확인하기" onClick={()=>go('discover')}>절세 시작하기 <ArrowRight size={19}/></button>
   <button className="welcome-profile" onClick={onSelect}>{c.name}님 · {c.subtitle}<ChevronRight size={15}/></button>
   <button className="welcome-down" aria-label="내 자산으로 이동" onClick={()=>document.getElementById('bank-assets')?.scrollIntoView({behavior:'smooth',block:'start'})}><ChevronDown size={25}/></button>
 </section>
 <section className="bank-assets" id="bank-assets">
  <div className="bank-section-heading"><h2>자산·절세</h2><button onClick={()=>go('data')}><Plus size={14}/>자산 확인</button></div>
  <div className="asset-presentation">
   <p>자산 분석부터 절세 실행까지 한 번에</p><h2>내 금융, 더 잘 키울 수 있어요</h2>
   <div className="asset-card mini-dashboard"><div className="asset-summary"><span>입출금 잔액</span><button aria-label={hidden?'금액 표시':'금액 숨기기'} onClick={()=>setHidden(!hidden)}>{hidden?<EyeOff size={14}/>:<Eye size={14}/>}금액{hidden?'표시':'숨김'}</button></div><strong>{cash}<small>원</small></strong>
    <button className="dashboard-row" onClick={()=>go('data')}><span>입출금·저축</span><b>{cash}원</b><ChevronRight size={15}/></button>
    <button className="dashboard-row" onClick={()=>go('benefit/isa')}><span>투자</span><b>{c.id==='investor'?(hidden?'•••':'12,500,000')+'원':'ISA 확인'}</b><ChevronRight size={15}/></button>
    <button className="dashboard-row" onClick={()=>go('benefit/pension')}><span>연금·청약</span><b>{c.accounts.length}개 계좌</b><ChevronRight size={15}/></button>
    <button className="dashboard-row" onClick={()=>go('history')}><span>완료한 작업</span><b>{c.actions.filter(a=>a.status==='success').length}건</b><ChevronRight size={15}/></button>
    <button className="dashboard-footer" onClick={()=>go('discover')}><Wallet size={15}/> 내 금융정보로 절세 기회를 찾아봐요 <ChevronRight size={14}/></button>
   </div>
   <button className="gradient-cta" onClick={()=>go('discover')}>내 자산으로 절세 시작하기 <ArrowRight size={18}/></button>
  </div>
  <div className="bank-benefit-promo"><h2>내 상황을 확인하면<br/>다음 행동이 더 분명해져요</h2><div className="progress-gauge"><svg viewBox="0 0 260 140" aria-hidden="true"><path d="M20 125a110 110 0 0 1 220 0" pathLength="100"/><path d="M20 125a110 110 0 0 1 220 0" pathLength="100" strokeDasharray="62 100"/></svg><div><span>나에게 맞는</span><strong>8가지 절세·지원 기회</strong></div></div><button onClick={()=>go('benefits')}>놓친 혜택 확인해보세요 <ArrowRight size={20}/></button></div>
  <button className="bank-agent-banner" onClick={()=>go('agent')}><WonSymbol/><span><strong>궁금할 땐, WON 세금비서</strong><small>왜 필요한지부터 다음 행동까지</small></span><ChevronRight size={18}/></button>
  <p className="footer-note"><ShieldCheck size={13}/> 고객님의 동의 안에서만 실행해요</p>
 </section>
 </>
}
