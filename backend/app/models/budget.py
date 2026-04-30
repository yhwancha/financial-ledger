from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint

from app.core.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    amount = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_budget_user_ym"),
    )
