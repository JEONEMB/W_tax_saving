import {type Benefit,type Customer,titles} from './domain';

export function recommendations(c:Customer){
 const order:Benefit[]=c.focus==='grant_child'?['grant_child','grant_work','card']:c.focus==='grant_work'?['grant_work','card','rent']:c.focus==='isa'?['isa','pension','card']:c.focus==='rent'?['rent','housing','card']:c.focus==='housing'?['housing','pension','card']:['pension','housing','card'];
 return order.map(benefit=>{
  const account=c.accounts.find(a=>a.kind===benefit);
  const completed=c.actions.some(a=>a.benefit===benefit&&a.status==='success');
  const copy:Record<Benefit,[string,string]>={
   pension:[account?'보유한 연금계좌의 납입 현황에서 추가 공제 가능성을 확인해 보세요.':'은행 샘플에 연금계좌가 없어요. 타행 보유 여부와 장기 자금 계획부터 확인해요.',account?'추가 납입안 확인':'연금계좌 개설 준비'],
   isa:[account?'개설한 ISA와 투자 목적을 다시 확인할 수 있어요.':'주식 투자 고객 시나리오예요. 타기관 정보 이용 동의와 ISA 보유 여부를 확인하면 투자 목적에 맞는 유형을 찾을 수 있어요.',account?'ISA 개설 결과 확인':'ISA 유형 선택·개설 준비'],
   housing:[account?'보유 청약계좌의 납입과 무주택·소득 조건을 함께 확인해요.':'은행 샘플에 청약계좌가 없어요. 타행 보유 여부와 주거 조건을 확인해요.',account?'청약 납입·공제 확인':'청약계좌 개설 준비'],
   rent:[c.focus==='rent'?'월세 거주 시나리오예요. 반복 이체와 계약·주소 정보를 대조해 증빙을 준비할 수 있어요.':'월세로 거주한다면 확인해 볼 수 있어요. 계약·주소·이체 내역의 추가 확인이 필요해요.','월세 증빙 준비'],
   card:['근로소득 고객이 확인할 수 있는 항목이에요. 총급여와 카드 사용 내역을 확인해요.','사용액·공제 조건 확인'],
   sme:['회사 업종과 취업 이력을 확인해야 해요.','감면 조건 확인'],
   grant_work:['급여 입금만으로 수급 여부를 판단하지 않아요. 가구 소득·재산을 확인하고 공식 신청 전 자료를 준비해요.','근로장려금 신청 준비'],
   grant_child:['자녀 양육 고객 시나리오예요. 부양자녀·가구 소득·재산을 확인해 신청 준비를 도와드려요.','자녀장려금 신청 준비']
  };
  return {benefit,title:titles[benefit],reason:copy[benefit][0],action:copy[benefit][1],status:completed?'진행 결과 확인':c.budget<=0&&['pension','housing'].includes(benefit)?'예산·조건 확인 먼저':'추가 조건 확인 필요'};
 });
}
