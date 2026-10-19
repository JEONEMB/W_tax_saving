import copy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from backend.engine import demo_input, diagnose, scenario, card_amount, RULES
from backend.models import Input
from backend.agent import explain
import backend.app as api

def prepared():
    data=demo_input()
    data['consent']=True
    data['profile']['addressMatch']=True
    return data

def card(data, bid): return next(c for c in diagnose(data)['cards'] if c['id']==bid)

class RulesTests(unittest.TestCase):
    def test_standard_calculations(self):
        data=prepared()
        self.assertEqual(card(data,'rent')['amount'],1224000)
        self.assertEqual(card(data,'housing')['amount'],960000)
        self.assertEqual(scenario(data,'pension',2000000)['delta'],300000)

    def test_unknown_and_negative_address(self):
        for value in (None,False):
            data=prepared();data['profile']['addressMatch']=value
            self.assertIsNone(card(data,'rent')['amount'])

    def test_rent_receipt_duplicate_and_cancel(self):
        data=prepared();receipt={**data['transactions'][0],'id':'receipt','category':'general','method':'cash'}
        data['transactions'].extend([receipt,copy.deepcopy(data['transactions'][0])])
        self.assertEqual(card(data,'card')['amount'],1200000)
        data['profile']['claimRent']=False
        self.assertEqual(card(data,'card')['amount'],1380000)
        data['profile']['claimRent']=None
        self.assertIsNone(card(data,'card')['amount'])
        data['transactions'][0]['cancelled']=True
        self.assertEqual(len(diagnose(data)['evidence']['rent']),11)
        self.assertIsNone(card(data,'rent')['amount'])

    def test_conflicting_duplicates_require_review(self):
        data=prepared();data['transactions'].append({**data['transactions'][0],'amount':700000})
        self.assertEqual(card(data,'rent')['eligibility'],'review_required')

    def test_pension_unknown_and_combined_cap(self):
        data=prepared();data['profile']['otherPensionKnown']=None
        self.assertIsNone(card(data,'pension')['amount'])
        self.assertFalse(scenario(data,'pension',2000000)['canSave'])
        data['profile'].update(otherPensionKnown=True,pensionPaid=6000000,irpPaid=4000000)
        self.assertEqual(card(data,'pension')['amount'],1350000)
        self.assertEqual(scenario(data,'pension',2000000)['delta'],0)

    def test_card_threshold_and_children(self):
        self.assertEqual([card_amount(40000000,n,0) for n in [9999999,10000000,10000020]],[0,0,3])
        self.assertEqual(card_amount(40000000,50000000,0),3000000)
        data=prepared();data['profile']['noChildren']=False
        self.assertIsNone(card(data,'card')['amount'])

    def test_unsupported_year_and_no_income(self):
        data=prepared();data['taxYear']=2025
        self.assertTrue(all(c['amount'] is None for c in diagnose(data)['cards']))
        data=demo_input('B');data['consent']=True
        self.assertTrue(all(c['eligibility']=='ineligible' for c in diagnose(data)['cards'] if c['id']!='isa'))

    def test_no_budget_or_liquidity_does_not_save(self):
        for field,value in [('budget',0),('budget',None),('liquid',False),('liquid',None)]:
            data=prepared();data['profile'][field]=value
            self.assertFalse(scenario(data,'pension',2000000)['canSave'])

    def test_shared_cap_and_no_summed_refund(self):
        data=prepared();data['profile']['loanDeduction']=3500000
        self.assertEqual(card(data,'housing')['amount'],500000)
        self.assertNotIn('totalRefund',diagnose(data))

    def test_special_spending_requires_review(self):
        data=prepared();data['transactions'][-1]['category']='special'
        self.assertIsNone(card(data,'card')['amount'])

    def test_real_input_changes_amount(self):
        data=prepared()
        for row in data['transactions']:
            if row['method']=='transfer':row['amount']=500000
        self.assertEqual(card(data,'rent')['amount'],1020000)

    def test_questions_and_consent(self):
        data=demo_input('manual');self.assertEqual(diagnose(data)['trace'],[])
        data['consent']=True
        self.assertEqual(len(diagnose(data)['questions']),3)

    def test_llm_unavailable_or_invalid_stays_grounded(self):
        data=prepared()
        with patch.dict('os.environ',{'OPENAI_API_KEY':'test','OPENAI_MODEL':'test'}):
            bad=Mock();bad.raise_for_status.return_value=None
            bad.json.return_value={'output':[{'content':[{'type':'output_text','text':json.dumps({'intent':'why','benefitId':'rent','questionKeys':[],'amount':999999})}]}]}
            with patch('backend.agent.httpx.post',return_value=bad):
                reply=explain(data,'rent','왜 가능한가요?',True)
                self.assertEqual(reply['mode'],'fallback')
                self.assertIn('1,224,000',reply['text'])
                self.assertNotIn('999999',reply['text'])
        with patch('backend.agent.httpx.post') as call:
            explain(data,'rent','왜 가능한가요?',False)
            call.assert_not_called()

    def test_approved_llm_routing_without_raw_data(self):
        good=Mock();good.raise_for_status.return_value=None
        good.json.return_value={'output':[{'content':[{'type':'output_text','text':json.dumps({'intent':'next','benefitId':'housing','questionKeys':[]})}]}]}
        with patch.dict('os.environ',{'OPENAI_API_KEY':'test','OPENAI_MODEL':'test'}),patch('backend.agent.httpx.post',return_value=good) as call:
            reply=explain(prepared(),'rent','청약 다음 단계는?',True)
            self.assertEqual(reply['mode'],'llm')
            self.assertEqual(reply['benefitId'],'housing')
            payload=json.dumps(call.call_args.kwargs['json'],ensure_ascii=False)
            self.assertNotIn('가상 임대인',payload)
            self.assertNotIn('40000000',payload)

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.directory=TemporaryDirectory()
        self.old_path=api.DB_PATH;api.DB_PATH=Path(self.directory.name)/'test.sqlite3'
        self.client=TestClient(api.app)
        self.headers={'Authorization':'Bearer '+'a'*64}
    def tearDown(self):
        self.client.close();api.DB_PATH=self.old_path;self.directory.cleanup()
    def state(self):return {'input':prepared(),'plans':[],'reminders':[],'revision':0}

    def test_store_reload_revision_and_delete(self):
        state=self.state()
        response=self.client.put('/api/state',json=state,headers=self.headers)
        self.assertEqual(response.status_code,200,response.text)
        saved=response.json()['state'];self.assertEqual(saved['revision'],1)
        self.assertEqual(self.client.get('/api/state',headers=self.headers).json(),saved)
        self.assertEqual(self.client.put('/api/state',json=state,headers=self.headers).status_code,409)
        self.assertIsNone(self.client.get('/api/state',headers={'Authorization':'Bearer '+'b'*64}).json())
        self.client.delete('/api/state',headers=self.headers)
        self.assertIsNone(self.client.get('/api/state',headers=self.headers).json())

    def test_invalid_input_unknown_preserved(self):
        for field,value in [('grossSalary',-1),('grossSalary',True),('grossSalary','1000')]:
            data=prepared();data['profile'][field]=value
            self.assertEqual(self.client.post('/api/analyses',json=data,headers=self.headers).status_code,422)
        data=prepared();data['asOfDate']='2026-02-30'
        self.assertEqual(self.client.post('/api/analyses',json=data,headers=self.headers).status_code,422)
        data=prepared();data['profile']['grossSalary']=None
        reply=self.client.post('/api/analyses',json=data,headers=self.headers).json()
        self.assertIsNone(reply['cards'][0]['amount'])

    def test_answer_api_ownership(self):
        data=prepared();data['profile']['addressMatch']=None
        created=self.client.post('/api/analyses',json=data,headers=self.headers).json()
        path='/api/analyses/'+created['analysisId']+'/answers'
        reply=self.client.patch(path,json={'addressMatch':True},headers=self.headers)
        self.assertEqual(reply.status_code,200,reply.text)
        self.assertEqual(reply.json()['cards'][0]['amount'],1224000)
        self.assertEqual(self.client.patch(path,json={'addressMatch':True},headers={'Authorization':'Bearer '+'b'*64}).status_code,404)
        self.assertEqual(self.client.patch(path,json={'fakeRate':99},headers=self.headers).status_code,422)

    def test_plan_completion_and_invalidation(self):
        saved=self.client.put('/api/state',json=self.state(),headers=self.headers).json()['state']
        plan={'benefitId':'rent','status':'done','checked':[True,True,True],'due':'2026-12-01','kind':'documents','amount':None}
        response=self.client.post('/api/action-plans',json=plan,headers=self.headers)
        self.assertEqual(response.status_code,200,response.text)
        state=response.json()['state'];state['input']['profile']['addressMatch']=False
        response=self.client.put('/api/state',json=state,headers=self.headers)
        self.assertEqual(response.json()['state']['plans'][0]['status'],'recheck')
        self.assertEqual(response.json()['state']['plans'][0]['checked'],[False]*3)

    def test_no_consent_no_persistence_and_forged_contribution(self):
        state=self.state();state['input']['consent']=False
        self.assertEqual(self.client.put('/api/state',json=state,headers=self.headers).status_code,403)
        state=self.state();state['input']['profile']['budget']=0
        state['plans']=[{'benefitId':'pension','kind':'contribution','amount':2000000}]
        self.assertEqual(self.client.put('/api/state',json=state,headers=self.headers).status_code,422)

if __name__=='__main__':unittest.main()
