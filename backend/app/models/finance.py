import enum
from datetime import date

from sqlalchemy import Date, Integer, Boolean, ForeignKey, CHAR
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPKMixin, TimestampMixin


class FeeType(str, enum.Enum):
    scolarite = "scolarite"
    inscription = "inscription"
    cantine = "cantine"
    transport = "transport"
    autre = "autre"


class InvoiceStatus(str, enum.Enum):
    paye = "paye"
    partiel = "partiel"
    impaye = "impaye"


class Invoice(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "invoices"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("students.id", ondelete="CASCADE"), index=True)
    type_frais: Mapped[FeeType] = mapped_column(SAEnum(FeeType))
    montant_total: Mapped[int] = mapped_column(Integer)
    montant_paye: Mapped[int] = mapped_column(Integer, default=0)
    reste_a_payer: Mapped[int] = mapped_column(Integer, default=0)
    date_emission: Mapped[date] = mapped_column(Date, default=date.today)
    statut: Mapped[InvoiceStatus] = mapped_column(SAEnum(InvoiceStatus), default=InvoiceStatus.impaye)


class PaymentMethod(str, enum.Enum):
    especes = "especes"
    cheque = "cheque"
    virement = "virement"
    mobile_money = "mobile_money"
    carte_bancaire = "carte_bancaire"


class Payment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "payments"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    invoice_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    montant: Mapped[int] = mapped_column(Integer)
    date_paiement: Mapped[date] = mapped_column(Date, default=date.today)
    mode_paiement: Mapped[PaymentMethod] = mapped_column(SAEnum(PaymentMethod))
    partiel: Mapped[bool] = mapped_column(Boolean, default=False)
