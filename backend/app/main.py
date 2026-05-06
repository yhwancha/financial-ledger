from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models import user, transaction, budget  # noqa: F401 - 모델 등록용
from app.routers import auth, transactions, budgets, users

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance Ledger API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://financial-ledger-1.onrender.com",
        "https://financial-ledger-1.onrender.com/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(transactions.router)
app.include_router(budgets.router)


@app.get("/health")
def health():
    return {"status": "ok"}
