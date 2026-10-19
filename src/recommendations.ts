import {type Benefit,type Customer,titles} from './domain';

export function recommendations(c:Customer){
 const order:Benefit[]=c.focus==='grant_child'?['grant_child','grant_work','card']:c.focus==='grant_work'?['grant_work','card','rent']:c.focus==='isa'?['isa','pension','card']:c.focus==='rent'?['rent','housing','card']:c.focus==='housing'?['housing','pension','card']:['pension','housing','card'];
 return order.map(benefit=>{
  const account=c.accounts.find(a=>a.kind===benefit);
  const completed=c.actions.some(a=>a.benefit===benefit&&a.status==='success');
  const copy:Record<Benefit,[string,string]>={
   pension:[account?`올해 연금저축에 ${account.contributed.toLocaleString('ko-KR')}원을 납입했어요. 타행 납입을 확인하면 추가 공제 여력을 계산할 수 있어요.`:'우리은행 연금계좌가 없어요. 고객정보로 개설을 준비하고, 추가 납입은 별도로 확인할게요.',account?'추가 납입안 확인':'연금계좌 개설 준비'],
   isa:[account?'개설한 ISA와 투자 목적을 다시 확인할 수 있어요.':'기존 상담에서 국내 주식 직접 투자를 선호하셨어요. ISA 보유·가입 조건을 확인해 맞는 유형을 안내할게요.',account?'ISA 개설 결과 확인':'ISA 유형 선택·개설 준비'],
   housing:[account?`청약계좌의 올해 납입액은 ${account.contributed.toLocaleString('ko-KR')}원이에요. 주거·소득 조건에 따라 공제 대상이 될 수 있어요.`:'우리은행 청약계좌가 없어요. 다른 은행의 청약 보유 여부만 확인하면 개설을 준비할 수 있어요.',account?'청약 납입·공제 확인':'청약계좌 개설 준비'],
   rent:[c.focus==='rent'?'매월 60만원의 반복 이체 12건을 찾았어요. 동의해 주시면 계약·주소 자료를 대조하고 월세 증빙을 정리할게요.':'월세 지출이 있다면 계약·주소 자료를 확인해 공제 가능성을 살펴볼 수 있어요.','월세 증빙 준비'],
   card:['근로소득 고객이 확인할 수 있는 항목이에요. 총급여와 카드 사용 내역을 확인해요.','사용액·공제 조건 확인'],
   sme:['회사 업종과 취업 이력을 확인해야 해요.','감면 조건 확인'],
   grant_work:['등록된 고객정보와 급여 입금 내역에서 지원 가능성을 찾았어요. 동의 후 가구 소득·재산을 확인하고 신청을 도와드릴게요.','추가 자료 확인 후 신청'],
   grant_child:['기존 고객정보의 자녀 양육 정보에서 지원 가능성을 찾았어요. 부양자녀·가구 소득·재산을 확인해 신청을 도와드릴게요.','추가 자료 확인 후 신청']
  };
  return {benefit,title:titles[benefit],reason:copy[benefit][0],action:copy[benefit][1],status:completed?'진행 결과 확인':c.budget<=0&&['pension','housing'].includes(benefit)?'예산·조건 확인 먼저':'추가 조건 확인 필요'};
 });
}
