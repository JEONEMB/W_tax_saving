from datetime import date
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field

Money = Annotated[int, Field(strict=True, ge=0, le=1_000_000_000_000)]
Benefit = Literal['rent', 'housing', 'pension', 'card', 'sme', 'isa']

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

class Profile(StrictModel):
    resident: bool | None = None
    incomeType: Literal['employment', 'none', 'mixed'] | None = None
    grossSalary: Money | None = None
    aggregateIncome: Money | None = None
    standardEmployment: bool | None = None
    standardHousehold: bool | None = None
    housingEligible: bool | None = None
    addressMatch: bool | None = None
    rentConfirmed: bool | None = None
    claimRent: bool | None = None
    housingQualified: bool | None = None
    housingPaid: Money | None = None
    loanDeduction: Money | None = None
    otherPensionKnown: bool | None = None
    pensionPaid: Money | None = None
    irpPaid: Money | None = None
    noChildren: bool | None = None
    isaEligible: bool | None = None
    isaHeld: bool | None = None
    budget: Money | None = None
    liquid: bool | None = None

class Transaction(StrictModel):
    id: str = Field(min_length=1, max_length=80, pattern=r'^[A-Za-z0-9_-]+$')
    expenseId: str = Field(min_length=1, max_length=80, pattern=r'^[A-Za-z0-9_-]+$')
    date: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
    amount: Money
    category: Literal['transfer', 'rent', 'general', 'special', 'excluded']
    method: Literal['transfer', 'credit', 'debit', 'cash']
    counterparty: str = Field(default='sample', min_length=1, max_length=60)
    cancelled: bool = False

class Contract(StrictModel):
    monthlyRent: Money | None = None
    startDate: str | None = Field(default=None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    endDate: str | None = Field(default=None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    confirmedByUser: Literal[True]
    inputOrigin: Literal['ocr', 'manual']

class Input(StrictModel):
    taxYear: int = Field(ge=2000, le=2100)
    asOfDate: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
    profile: Profile
    transactions: list[Transaction] = Field(max_length=3000)
    appliedBenefits: list[Benefit] = Field(default_factory=list, max_length=6)
    consent: bool = False
    contract: Contract | None = None

    def checked(self):
        date.fromisoformat(self.asOfDate)
        for row in self.transactions:
            date.fromisoformat(row.date)
        if self.contract:
            for value in (self.contract.startDate, self.contract.endDate):
                if value: date.fromisoformat(value)
            if self.contract.startDate and self.contract.endDate and self.contract.startDate > self.contract.endDate:
                raise ValueError('Invalid lease period')
        return self

class Plan(StrictModel):
    benefitId: Benefit
    status: Literal['preparing', 'done', 'deferred', 'recheck'] = 'preparing'
    checked: list[bool] = Field(default_factory=lambda: [False, False, False], min_length=3, max_length=3)
    due: str | None = Field(default=None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    kind: Literal['documents', 'contribution'] = 'documents'
    amount: Money | None = None

class State(StrictModel):
    input: Input
    plans: list[Plan] = Field(default_factory=list, max_length=6)
    reminders: list[str] = Field(default_factory=list, max_length=4)
    revision: int = Field(default=0, ge=0)

class ScenarioRequest(StrictModel):
    input: Input
    kind: Literal['pension', 'card']
    amount: Money

class ChatRequest(StrictModel):
    input: Input
    benefitId: Benefit
    message: str = Field(min_length=1, max_length=1000)
    llmConsent: bool = False
