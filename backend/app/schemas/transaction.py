from datetime import date
from enum import Enum
from typing import Optional

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
    date: Optional[date] = None
    type: Optional[TxType] = None
    category: Optional[str] = None
    amount: Optional[int] = Field(default=None, gt=0)
    memo: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    date: date
    type: TxType
    category: str
    amount: int
    memo: str

    class Config:
        from_attributes = True
