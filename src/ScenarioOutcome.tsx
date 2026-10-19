import {housingDeduction,pensionCredit,rentCredit} from './domain';

// Fixed, standard demo outcomes; independent of the customer's edited/live state.
const won=(amount:number)=>`${amount.toLocaleString('ko-KR')}원`;
const outcomes:Record<string,{action:string;effect:string;note:string}>={
 'grant-worker':{action:'추가 정보 조회 동의 → Agent 근로장려금 신청',effect:'신청서 자동 작성 · 모의 접수 결과 확인',note:'정부지원 · 지급액 미확정 · 실제 국세청 접수 없음'},
 'grant-parent':{action:'가구·부양자녀 조회 → Agent 자녀장려금 신청',effect:'신청 동의·인증 후 모의 접수까지 처리',note:'2025년 소득 기준 · 모의 접수번호 발급'},
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
