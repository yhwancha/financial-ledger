from sqlalchemy import Column, Integer, String, Date, Enum, ForeignKey, DateTime, func
import enum

from app.core.database import Base


class TxType(str, enum.Enum):
    income = "income"
    expense = "expense"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    type = Column(Enum(TxType), nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)
    memo = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
