import hashlib
import json
import os
from contextlib import contextmanager, closing
from datetime import date
from pathlib import Path
import re
import sqlite3
from uuid import uuid4
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from .models import Input, State, Plan, Profile, ScenarioRequest, ChatRequest
from .engine import RULES, demo_input, diagnose, scenario
from .agent import explain

load_dotenv(Path(__file__).parent.parent / '.env')
app = FastAPI(title='WON 세금비서 MVP', version=RULES['version'])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=['localhost','127.0.0.1','testserver'])
DB_PATH = Path(os.getenv('WON_DB_PATH', str(Path(__file__).parent / 'data/won.sqlite3')))

@contextmanager
def database():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(DB_PATH, timeout=10)) as db, db:
        db.row_factory = sqlite3.Row
        db.execute('CREATE TABLE IF NOT EXISTS sessions (owner TEXT PRIMARY KEY, profile TEXT, transactions TEXT, consent TEXT, plans TEXT, reminders TEXT, revision INTEGER)')
        db.execute('CREATE TABLE IF NOT EXISTS analyses (id TEXT PRIMARY KEY, owner TEXT, input TEXT, result TEXT)')
        yield db

def owner(authorization: str = Header(default='')):
    if not re.fullmatch(r'Bearer [A-Za-z0-9_-]{32,128}', authorization):
        raise HTTPException(401, '체험 세션 키가 필요합니다.')
    return hashlib.sha256(authorization.encode()).hexdigest()

def checked(data: Input):
    try: return data.checked().model_dump()
    except ValueError: raise HTTPException(422, '실제 달력에 있는 날짜를 입력하세요.')

def validate_plans(state):
    for plan in state.plans:
        if plan.due:
            try: date.fromisoformat(plan.due)
            except ValueError: raise HTTPException(422, '할 일 기한을 확인하세요.')
        if plan.status == 'done' and not all(plan.checked):
            raise HTTPException(422, '서류 확인을 모두 완료해야 합니다.')
        if plan.kind == 'contribution' and plan.status != 'recheck':
            if plan.benefitId != 'pension' or plan.amount is None or not scenario(state.input.model_dump(), 'pension', plan.amount)['canSave']:
                raise HTTPException(422, '납입 과제를 저장할 수 있는 예산·조건이 아닙니다.')
    if len({p.benefitId for p in state.plans}) != len(state.plans): raise HTTPException(422, '중복 과제입니다.')
    if any(r not in {c['id'] for c in RULES['catalog']} for r in state.reminders): raise HTTPException(422, '알 수 없는 알림입니다.')

def read_state(db, user):
    row = db.execute('SELECT * FROM sessions WHERE owner=?',(user,)).fetchone()
    if not row: return None
    return {'input':{**json.loads(row['profile']), 'transactions':json.loads(row['transactions']), 'consent':json.loads(row['consent'])},
            'plans':json.loads(row['plans']), 'reminders':json.loads(row['reminders']), 'revision':row['revision']}

@app.get('/api/health')
def health(): return {'status':'ok', 'ruleVersion':RULES['version'], 'llmConfigured':bool(os.getenv('OPENAI_API_KEY') and os.getenv('OPENAI_MODEL'))}

@app.get('/api/demo-profiles')
def profiles(): return [{'id':k,'label':label,'input':demo_input(k)} for k,label in [('A','월세 거주 직장인'),('B','근로소득 없는 구직자'),('C','타행·가구 정보 확인 필요'),('manual','직접 입력')]]

@app.get('/api/rules')
def rules(): return RULES

@app.get('/api/state')
def get_state(user=Depends(owner)):
    with database() as db: return read_state(db,user)

@app.put('/api/state')
def save_state(state: State, user=Depends(owner)):
    data = checked(state.input)
    if not data['consent']: raise HTTPException(403, '자료 이용 동의 후 저장하세요. 철회는 삭제 API를 사용합니다.')
    with database() as db:
        db.execute('BEGIN IMMEDIATE')
        old = read_state(db,user)
        if state.revision != (old['revision'] if old else 0): raise HTTPException(409, '다른 탭에서 저장했습니다. 불러온 뒤 다시 저장하세요.')
        if old and old['input'] != data:
            for plan in state.plans:
                plan.status = 'recheck'
                plan.checked = [False,False,False]
        validate_plans(state)
        payload = state.model_dump()
        profile = {k:v for k,v in data.items() if k not in ('transactions','consent')}
        db.execute('INSERT OR REPLACE INTO sessions VALUES (?,?,?,?,?,?,?)', (user,json.dumps(profile),json.dumps(data['transactions']),json.dumps(data['consent']),json.dumps(payload['plans']),json.dumps(payload['reminders']),state.revision+1))
        result = read_state(db,user)
    return {'state':result, 'analysis':diagnose(data)}

@app.delete('/api/state', status_code=204)
def delete_state(user=Depends(owner)):
    with database() as db:
        db.execute('DELETE FROM sessions WHERE owner=?',(user,))
        db.execute('DELETE FROM analyses WHERE owner=?',(user,))

@app.post('/api/analyses')
def create_analysis(data: Input, user=Depends(owner)):
    value = checked(data)
    result = diagnose(value)
    if not data.consent: return {**result, 'analysisId':None}
    analysis_id = str(uuid4())
    with database() as db:
        db.execute('INSERT INTO analyses VALUES (?,?,?,?)',(analysis_id,user,json.dumps(value),json.dumps(result)))
        db.execute('DELETE FROM analyses WHERE owner=? AND id NOT IN (SELECT id FROM analyses WHERE owner=? ORDER BY rowid DESC LIMIT 20)',(user,user))
    return {**result, 'analysisId':analysis_id}

@app.patch('/api/analyses/{analysis_id}/answers')
def answers(analysis_id:str, patch:dict, user=Depends(owner)):
    with database() as db:
        row = db.execute('SELECT input FROM analyses WHERE id=? AND owner=?',(analysis_id,user)).fetchone()
        if not row: raise HTTPException(404, '이 세션의 진단이 아닙니다.')
        data = json.loads(row['input'])
        try: data['profile'] = Profile.model_validate({**data['profile'],**patch}).model_dump()
        except ValueError: raise HTTPException(422, '응답 필드와 값을 확인하세요.')
        result = diagnose(data)
        db.execute('UPDATE analyses SET input=?,result=? WHERE id=? AND owner=?',(json.dumps(data),json.dumps(result),analysis_id,user))
    return {**result,'analysisId':analysis_id, 'updatedCards':result['cards'], 'remainingQuestions':result['questions']}

@app.post('/api/scenarios')
def scenarios(request: ScenarioRequest): return scenario(checked(request.input),request.kind,request.amount)

@app.post('/api/chat')
def chat(request: ChatRequest): return explain(checked(request.input), request.benefitId, request.message, request.llmConsent)

@app.post('/api/action-plans')
def action_plan(plan: Plan, user=Depends(owner)):
    with database() as db: saved = read_state(db,user)
    if not saved: raise HTTPException(404,'먼저 진단을 저장하세요.')
    saved['plans'] = [p for p in saved['plans'] if p['benefitId']!=plan.benefitId]+[plan.model_dump()]
    return save_state(State.model_validate(saved),user)
