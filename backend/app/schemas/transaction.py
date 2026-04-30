from datetime import date
from enum import Enum

from pydantic import BaseModel, Field


class TxType(str, Enum):
    income = "income"
    expense = "expense"


class TransactionCreate(BaseModel):
    date: date
    type: TxType
    category: str
    amount: int = Field(gt=0)
    memo: str = ""


class TransactionUpdate(BaseModel):
    date: date | None = None
    type: TxType | None = None
    category: str | None = None
    amount: int | None = Field(default=None, gt=0)
    memo: str | None = None


class TransactionResponse(BaseModel):
    id: int
    date: date
    type: TxType
    category: str
    amount: int
    memo: str

    class Config:
        from_attributes = True
