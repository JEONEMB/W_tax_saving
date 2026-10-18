import {housingDeduction,pensionCredit,rentCredit} from './domain';

// Fixed, standard demo outcomes; independent of the customer's edited/live state.
const won=(amount:number)=>`${amount.toLocaleString('ko-KR')}원`;
const outcomes:Record<string,{action:string;effect:string;note:string}>={
 'grant-worker':{action:'급여·계좌 자료 정리 → 근로장려금 신청 준비',effect:'가구 소득·재산 확인 후 준비서 생성',note:'정부지원 · 지급액 미확정 · 공식 홈택스에서 직접 신청'},
 'grant-parent':{action:'가구·부양자녀 확인 → 자녀장려금 신청 준비',effect:'은행 정보와 고객 응답을 신청 자료로 정리',note:'2025년 소득 기준 · 준비 완료와 공식 접수는 별개'},
 pension:{action:'기존 연금저축에 200만원 추가 납입',effect:`국세 세액공제 계산액 +${won(pensionCredit(5_000_000)-pensionCredit(3_000_000))}`,note:'신규 개설 없이 보유 계좌 활용'},
 'new-pension':{action:'연금저축계좌 개설 → 200만원 납입',effect:`국세 세액공제 계산액 ${won(pensionCredit(2_000_000))}`,note:'개설·납입 각각 동의 · 개설만으로 공제 없음'},
 investor:{action:'투자 목적에 맞는 ISA 계좌 개설',effect:'직접 주식 투자: 중개형 / 은행 운용: 신탁형',note:'개설만으로 절세액 발생 없음 · 기존 주식 이전 없음'},
 housing:{action:'청약계좌 개설 → 첫 20만원 납입',effect:`적격 납입 시 소득공제 계산액 ${won(housingDeduction(200_000))}`,note:'8만원 환급이 아닌 과세 대상 소득의 공제'},
 renter:{action:'월세 12건 정리 → 샘플 증빙 보고서',effect:`국세 세액공제 계산액 ${won(rentCredit(7_200_000,40_000_000,'yes')!)}`,note:'월세 월 60만원 기준 · 계좌 개설·신고 없음'},
 unknown:{action:'미확인 조건 질문 → 정보 보완·재진단',effect:'조건 확인 전 절세액 계산 보류',note:'가입 조건 확인 후 개설 가능 · 예산 0원은 납입 차단'},
};

export default function ScenarioOutcome({id}:{id:string}){
 const outcome=outcomes[id];
 if(!outcome)return null;
 return <span className="scenario-outcome"><span className="scenario-outcome-label">시연 결과 미리보기</span><span className="scenario-action">{outcome.action}</span><span className="scenario-effect">{outcome.effect}</span><span className="scenario-note">{outcome.note}</span></span>;
}
