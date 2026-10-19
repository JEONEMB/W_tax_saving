"""Deterministic MVP rules. Only the supplied spec's standard cases are calculated."""
import copy
import json
from pathlib import Path

RULES = json.loads((Path(__file__).parent.parent / 'shared/rules.json').read_text(encoding='utf-8'))
L, R = RULES['limits'], RULES['rates']

def transactions(data):
    by_id, conflicts = {}, set()
    for row in data['transactions']:
        old = by_id.get(row['id'])
        if old and not row['cancelled'] and not old['cancelled'] and old != row:
            conflicts.add(row['id'])
        by_id[row['id']] = row
    by_expense = {}
    cancelled = {r['expenseId'] for r in data['transactions'] if r['cancelled']}
    for row in by_id.values():
        if row['date'][:4] != str(data['taxYear']) or row['expenseId'] in cancelled:
            continue
        old = by_expense.get(row['expenseId'])
        if old and (old['amount'] != row['amount'] or old['date'] != row['date']):
            conflicts.add(row['expenseId'])
        # Prefer the transfer evidence over its cash receipt: one physical expense.
        if not old or row['method'] == 'transfer':
            by_expense[row['expenseId']] = row
    rows = list(by_expense.values())
    groups = {}
    for row in rows:
        if row['category'] in ('rent', 'transfer') and row['method'] == 'transfer':
            groups.setdefault((row['counterparty'], row['amount']), []).append(row)
    rent = [r for group in groups.values() if len({r['date'][:7] for r in group}) >= 3 for r in group]
    rent_ids = {r['expenseId'] for r in rent}
    receipt_ids = {r['expenseId'] for r in by_id.values() if r['method'] == 'cash' and not r['cancelled']}
    return {'rows': rows, 'rent': rent, 'conflicts': sorted(conflicts),
            'rentReceiptIds': sorted(rent_ids & receipt_ids),
            'removed': len(data['transactions']) - len(rows),
            'specialCount': sum(r['category'] == 'special' for r in rows)}

def pension(p, extra=0):
    eligible = min(min(p['pensionPaid'] + extra, L['pension']) + p['irpPaid'], L['pensionCombined'])
    rate = R['pensionLow'] if p['grossSalary'] <= L['lowSalary'] else R['pensionHigh']
    return eligible * rate // 100

def card_amount(salary, credit, debit):
    threshold = salary * R['cardThreshold'] // 100
    cap = L['cardLowCap'] if salary <= L['cardSalary'] else L['cardHighCap']
    return min((max(0, credit-threshold)*R['credit'] + max(0, debit-max(0, threshold-credit))*R['debit']) // 100, cap)

def card_totals(data, tx):
    p = data['profile']
    rent_ids = {r['expenseId'] for r in tx['rent']}
    credit = debit = 0
    for row in tx['rows']:
        if row['category'] == 'general' and row['expenseId'] not in rent_ids:
            if row['method'] == 'credit': credit += row['amount']
            if row['method'] in ('cash', 'debit'): debit += row['amount']
    # Cash receipts representing identified rent only enter when rent credit is declined.
    if p.get('claimRent') is False:
        debit += sum(r['amount'] for r in tx['rent'] if r['expenseId'] in tx['rentReceiptIds'])
    return credit, debit

def diagnose(data):
    p, tx = data['profile'], transactions(data)
    cards = []
    for rule in RULES['benefits']:
        bid = rule['id']
        missing = [key for key in rule['required'] if p.get(key) is None]
        status, reason = 'candidate', '입력 기준 적용 가능 후보입니다. 확정 판정·환급액이 아닙니다.'
        if missing: status, reason = 'needs_info', '판정에 필요한 정보를 확인해 주세요.'
        for key, expected, failure in rule['conditions']:
            if p.get(key) is not None and p[key] != expected:
                status, reason = failure, RULES['fields'][key]['label'] + ' 조건을 충족하지 않거나 추가 확인이 필요합니다.'
                if failure == 'needs_info' and key not in missing: missing.append(key)
                break
        if bid != 'isa':
            if p.get('incomeType') == 'none' or p.get('grossSalary') == 0:
                status, reason = 'ineligible', '근로소득 전용 표준 계산을 적용하지 않습니다. 소득 확인·제도 정보만 안내합니다.'
            elif p.get('incomeType') == 'mixed':
                status, reason = 'review_required', '근로 외 소득이 있는 사례는 이 표준 계산 범위를 벗어나 전문 검토가 필요합니다.'
        if bid == 'rent':
            if p.get('grossSalary') is not None and p['grossSalary'] > L['rentSalary'] or p.get('aggregateIncome') is not None and p['aggregateIncome'] > L['rentIncome']:
                status, reason = 'ineligible', '월세 소득 기준을 초과합니다.'
            elif status == 'candidate' and (len(tx['rent']) != 12 or len({r['date'][:7] for r in tx['rent']}) != 12):
                status, reason = 'review_required', '12개월 월세 후보를 확인하지 못했습니다. 부분 기간·변동 월세·여러 임대차는 별도 검토가 필요합니다.'
        if bid == 'housing' and p.get('grossSalary') is not None and p['grossSalary'] > L['housingSalary']:
            status, reason = 'ineligible', '청약 소득공제 총급여 기준을 초과합니다.'
        contract = data.get('contract')
        if bid == 'rent' and contract and status == 'candidate':
            if contract['monthlyRent'] is not None and any(r['amount'] != contract['monthlyRent'] for r in tx['rent']):
                status, reason = 'review_required', '확인한 계약서 월세와 이체 금액이 상충합니다. 관리비·계약 변경 여부를 확인하세요.'
            if contract['startDate'] and contract['startDate'] > f'{data["taxYear"]}-01-01' or contract['endDate'] and contract['endDate'] < f'{data["taxYear"]}-12-31':
                status, reason = 'review_required', '확인한 계약 기간이 연중 동일 임대차 표준 범위를 벗어납니다.'
        if bid == 'sme' and status == 'candidate':
            status, reason = 'review_required', '회사 업종·최초 적격 취업일·병역·기적용 여부를 확인해야 합니다. 급여만으로 감면액을 계산하지 않습니다.'
        if bid == 'card':
            if tx['rentReceiptIds'] and p.get('claimRent') is None:
                status, reason = 'needs_info', '같은 월세의 현금영수증이 있습니다. 월세 세액공제 적용 여부를 먼저 확인하세요.'
                if 'claimRent' not in missing: missing.append('claimRent')
            if tx['specialCount'] and status == 'candidate':
                status, reason = 'review_required', '전통시장·교통·문화체육 등 특수 사용분이 있어 일반 사용분만으로 전체 공제를 확정할 수 없습니다.'
        if tx['conflicts'] and bid in ('rent', 'card'):
            status, reason = 'review_required', '같은 거래 또는 지출의 금액·날짜가 상충합니다. 원자료를 확인해 주세요.'
        if data['taxYear'] != RULES['taxYear']:
            status, reason = 'review_required', '선택한 귀속연도의 규칙이 없습니다. 기존 연도 결과를 재사용하지 않습니다.'
        if not data['consent']:
            status, reason = 'needs_info', '가상 자료 이용 동의가 필요합니다.'
        amount, formula = None, '정보 확인 후 지원 범위 안에서만 계산합니다.'
        if status == 'candidate':
            if bid == 'rent':
                base = min(sum(r['amount'] for r in tx['rent']), L['rent'])
                rate = R['rentLow'] if p['grossSalary'] <= L['lowSalary'] and p['aggregateIncome'] <= L['lowIncome'] else R['rentHigh']
                amount, formula = base*rate//100, f'min(확인 월세, {L["rent"]:,}원) × {rate}%'
            elif bid == 'housing':
                amount = max(0, min(min(p['housingPaid'], L['housing'])*R['housing']//100, L['housingShared']-p['loanDeduction']))
                formula = 'min(납입액 300만원 한도 × 40%, 전세대출과 공유하는 400만원 잔여 한도)'
            elif bid == 'pension':
                amount = pension(p)
                formula = 'min(min(연금저축, 600만원) + IRP·DC, 900만원) × 국세 공제율'
            elif bid == 'card':
                credit, debit = card_totals(data, tx)
                amount = card_amount(p['grossSalary'], credit, debit)
                formula = f'일반 신용 {credit:,}원 / 체크·현금 {debit:,}원 → 총급여 25% 차감 후 15%·30%, 기본 한도 적용'
            elif bid == 'isa':
                formula = '비과세 한도 안내만 제공. 수익·가입 유형 미확정으로 예상 절세액을 계산하지 않습니다.'
                if p.get('isaHeld'): reason = '기존 ISA를 확인하세요. 중복 개설을 권하지 않습니다.'
        cards.append({**rule, 'benefitId': bid, 'taxYear':data['taxYear'], 'eligibility':status,
                      'availability':'open' if bid != 'isa' else 'unknown', 'actionStatus':'not_started',
                      'missingFields':missing, 'amount':amount, 'formula':formula, 'reason':reason,
                      'alreadyApplied':bid in data['appliedBenefits'], 'ruleVersion':RULES['version'],
                      'verifiedAt':RULES['verifiedAt'], 'isDemo':True})
    questions = list(dict.fromkeys(key for card in cards if card['eligibility']=='needs_info' for key in card['missingFields']))[:3]
    if not data['consent'] or data['taxYear'] != RULES['taxYear']: questions = []
    return {'cards':cards, 'questions':questions, 'ruleVersion':RULES['version'], 'taxYear':data['taxYear'],
            'evidence':tx if data['consent'] else {'rows':[], 'rent':[], 'conflicts':[], 'rentReceiptIds':[], 'removed':0, 'specialCount':0},
            'trace':['get_profile', 'get_transactions', 'find_candidates', 'evaluate_benefit', 'get_official_sources'] if data['consent'] else []}

def scenario(data, kind, amount):
    card = next(c for c in diagnose(data)['cards'] if c['id']==kind)
    p = data['profile']
    result = {'before':None, 'after':None, 'delta':None, 'amountType':card['amountType'], 'unit':card['unit'], 'canSave':False, 'reason':card['reason'], 'taxYear':data['taxYear'], 'ruleVersion':RULES['version']}
    if card['eligibility'] != 'candidate': return result
    if kind == 'pension':
        if p.get('budget') is None or p.get('liquid') is not True or amount > p['budget'] or amount <= 0:
            result['reason'] = '생활비 제외 여부와 가용 예산을 확인하세요. 예산 초과·0원 납입 과제는 저장하지 않습니다.'
            return result
        before, after = pension(p), pension(p, amount)
        reason = '국세 계산액 차이이며 실제 환급액이 아닙니다. 장기 유지·중도인출 조건과 실제 납입 한도는 금융기관에서 확인하세요.'
    else:
        credit, debit = card_totals(data, transactions(data))
        before = card_amount(p['grossSalary'], credit+amount, debit)
        after = card_amount(p['grossSalary'], credit, debit+amount)
        reason = '같은 예정 소비를 신용 또는 체크로 결제하는 비교입니다. 추가 소비를 권하지 않습니다.'
    return {**result, 'before':before, 'after':after, 'delta':after-before, 'canSave':kind=='pension' and after>before, 'reason':reason}

def demo_input(kind='A'):
    p = {key:None for key in RULES['fields']}
    p.update(resident=True, incomeType='employment', grossSalary=40_000_000, aggregateIncome=0,
             standardEmployment=True, standardHousehold=True, housingEligible=True,
             rentConfirmed=True, claimRent=True, housingQualified=True, housingPaid=2_400_000,
             loanDeduction=0, otherPensionKnown=True, pensionPaid=3_000_000, irpPaid=0,
             noChildren=True, isaEligible=True, isaHeld=False, budget=2_000_000, liquid=True)
    rows = [{'id':f'rent-{m}', 'expenseId':f'expense-{m}', 'date':f'2026-{m:02d}-05', 'amount':600000, 'category':'transfer', 'method':'transfer', 'counterparty':'가상 임대인', 'cancelled':False} for m in range(1,13)]
    rows += [{'id':'credit', 'expenseId':'credit', 'date':'2026-10-01', 'amount':12000000, 'category':'general','method':'credit','counterparty':'가상 일반소비','cancelled':False}, {'id':'debit', 'expenseId':'debit', 'date':'2026-10-01', 'amount':3000000, 'category':'general','method':'debit','counterparty':'가상 일반소비','cancelled':False}]
    if kind == 'B':
        p.update(incomeType='none', grossSalary=0, budget=0)
        rows = []
    if kind == 'C': p.update(otherPensionKnown=None, pensionPaid=None, irpPaid=None, standardHousehold=False, addressMatch=None, budget=None, liquid=None)
    if kind == 'manual':
        p = {key:None for key in RULES['fields']}
        rows = []
    return {'taxYear':2026, 'asOfDate':'2026-10-17', 'profile':p, 'transactions':rows, 'appliedBenefits':[], 'consent':False, 'contract':None}
