from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
def get_transactions(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= f"{year}-{month:02d}-01",
            Transaction.date < f"{year}-{month+1:02d}-01" if month < 12 else f"{year+1}-01-01",
        )
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .all()
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    body: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = Transaction(**body.model_dump(), user_id=current_user.id)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: int,
    body: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="내역을 찾을 수 없습니다.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tx, field, value)

    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="내역을 찾을 수 없습니다.")

    db.delete(tx)
    db.commit()
