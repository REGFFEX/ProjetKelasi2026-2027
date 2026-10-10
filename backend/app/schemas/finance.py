from datetime import date

from pydantic import BaseModel, Field

from app.models.finance import FeeType, InvoiceStatus, PaymentMethod


class InvoiceCreate(BaseModel):
    student_id: str
    type_frais: FeeType
    montant_total: int = Field(gt=0)
    date_emission: date = Field(default_factory=date.today)


class InvoiceOut(BaseModel):
    id: str
    school_id: str
    student_id: str
    type_frais: FeeType
    montant_total: int
    montant_paye: int
    reste_a_payer: int
    date_emission: date
    statut: InvoiceStatus

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    invoice_id: str
    montant: int = Field(gt=0)
    mode_paiement: PaymentMethod
    date_paiement: date = Field(default_factory=date.today)


class PaymentOut(BaseModel):
    id: str
    school_id: str
    invoice_id: str
    montant: int
    date_paiement: date
    mode_paiement: PaymentMethod
    partiel: bool

    model_config = {"from_attributes": True}


class PaymentResult(BaseModel):
    payment: PaymentOut
    invoice: InvoiceOut
