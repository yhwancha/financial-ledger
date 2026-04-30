from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.budget import Budget
from app.models.user import User
from app.schemas.budget import BudgetUpsert, BudgetResponse

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("/{year}/{month}", response_model=BudgetResponse)
def get_budget(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.year == year,
        Budget.month == month,
    ).first()

    # 설정 안 했으면 기본값 150만원
    if not budget:
        return BudgetResponse(year=year, month=month, amount=1500000)
    return budget


@router.put("/{year}/{month}", response_model=BudgetResponse)
def upsert_budget(
    year: int,
    month: int,
    body: BudgetUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.year == year,
        Budget.month == month,
    ).first()

    if budget:
        budget.amount = body.amount
    else:
        budget = Budget(user_id=current_user.id, year=year, month=month, amount=body.amount)
        db.add(budget)

    db.commit()
    db.refresh(budget)
    return budget
