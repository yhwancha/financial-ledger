from pydantic import BaseModel, Field


class BudgetUpsert(BaseModel):
    amount: int = Field(gt=0)


class BudgetResponse(BaseModel):
    year: int
    month: int
    amount: int

    class Config:
        from_attributes = True
