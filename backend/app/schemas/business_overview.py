from pydantic import BaseModel


class MonthlyRevenuePoint(BaseModel):
    mois: str
    montant: float


class FeeTypeBreakdown(BaseModel):
    type_frais: str
    montant: float


class CycleEnrollmentComparison(BaseModel):
    cycle: str
    actuel: int
    precedent: int


class RevenueOverview(BaseModel):
    current_month: float
    previous_month: float
    trend_pct: float | None
    collection_rate_pct: float | None
    total_invoiced: float
    total_collected: float
    total_outstanding: float
    revenue_per_student: float | None
    monthly_trend: list[MonthlyRevenuePoint]
    by_fee_type: list[FeeTypeBreakdown]


class EnrollmentOverview(BaseModel):
    current_total: int
    previous_total: int
    growth_pct: float | None
    attrition_pct: float | None
    new_enrollments: int
    by_cycle: list[CycleEnrollmentComparison]
    has_previous_year: bool


class StaffingOverview(BaseModel):
    active_teachers: int
    student_teacher_ratio: float | None
    hourly_cost_this_month: float | None


class BusinessOverview(BaseModel):
    academic_year_label: str | None
    revenue: RevenueOverview
    enrollment: EnrollmentOverview
    staffing: StaffingOverview
    alerts: list[str]
