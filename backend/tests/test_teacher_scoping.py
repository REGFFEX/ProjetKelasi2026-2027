from datetime import date

from app.models.academic import AcademicYear, AcademicYearStatus, Cycle, EvaluationMode, Level, Term
from app.models.people import Classroom, Student, Subject, Teacher, TeacherAssignment
from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def _setup(db_session):
    school = School(nom="Scope School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()

    year = AcademicYear(
        school_id=school.id, libelle="2026-2027", date_debut=date(2026, 9, 1),
        date_fin=date(2027, 7, 15), statut=AcademicYearStatus.active,
    )
    db_session.add(year)
    db_session.flush()
    term = Term(
        school_id=school.id, academic_year_id=year.id, libelle="T1",
        date_debut=date(2026, 9, 1), date_fin=date(2026, 12, 15),
    )
    db_session.add(term)

    cycle = Cycle(school_id=school.id, nom="Primaire", ordre=0, evaluation_mode=EvaluationMode.notes)
    db_session.add(cycle)
    db_session.flush()
    level = Level(school_id=school.id, cycle_id=cycle.id, nom="6ème", ordre=0)
    db_session.add(level)
    db_session.flush()

    classroom_a = Classroom(school_id=school.id, level_id=level.id, nom="6ème A")
    classroom_b = Classroom(school_id=school.id, level_id=level.id, nom="6ème B")
    db_session.add_all([classroom_a, classroom_b])
    db_session.flush()

    math = Subject(school_id=school.id, nom="Mathématiques", coefficient=4)
    french = Subject(school_id=school.id, nom="Français", coefficient=4)
    db_session.add_all([math, french])
    db_session.flush()

    teacher_user = User(
        school_id=school.id, nom="Jean Prof", email="jean.prof@test.cd",
        password_hash=hash_password("password123"), telephone="", role=Role.teacher, statut=UserStatus.actif,
    )
    db_session.add(teacher_user)
    db_session.flush()

    teacher = Teacher(
        school_id=school.id, user_id=teacher_user.id, nom="Prof", prenom="Jean",
        email="jean.prof@test.cd", telephone="",
    )
    db_session.add(teacher)
    db_session.flush()

    db_session.add(
        TeacherAssignment(
            school_id=school.id, teacher_id=teacher.id, subject_id=math.id,
            classroom_id=classroom_a.id, academic_year_id=year.id,
        )
    )

    student = Student(
        school_id=school.id, matricule="S-1", nom="Eleve", prenom="Un", date_naissance=date(2015, 1, 1),
        statut=UserStatus.actif,
    )
    db_session.add(student)
    db_session.commit()

    return {
        "school": school, "term": term, "classroom_a": classroom_a, "classroom_b": classroom_b,
        "math": math, "french": french, "student": student,
    }


def _login_teacher(client, school_id: str):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "jean.prof@test.cd", "password": "password123", "school_id": school_id},
    )
    assert resp.status_code == 200


def test_teacher_can_create_assessment_only_in_assigned_scope(client, db_session):
    ctx = _setup(db_session)
    _login_teacher(client, ctx["school"].id)

    ok = client.post(
        "/api/v1/assessments",
        json={
            "subject_id": ctx["math"].id, "classroom_id": ctx["classroom_a"].id, "term_id": ctx["term"].id,
            "libelle": "Interro", "date": "2026-10-01",
        },
    )
    assert ok.status_code == 200

    wrong_subject = client.post(
        "/api/v1/assessments",
        json={
            "subject_id": ctx["french"].id, "classroom_id": ctx["classroom_a"].id, "term_id": ctx["term"].id,
            "libelle": "Interro Français", "date": "2026-10-01",
        },
    )
    assert wrong_subject.status_code == 403

    wrong_classroom = client.post(
        "/api/v1/assessments",
        json={
            "subject_id": ctx["math"].id, "classroom_id": ctx["classroom_b"].id, "term_id": ctx["term"].id,
            "libelle": "Interro B", "date": "2026-10-01",
        },
    )
    assert wrong_classroom.status_code == 403


def test_teacher_cannot_grade_outside_assigned_scope(client, db_session):
    ctx = _setup(db_session)

    # Assessments created directly (simulating an admin having set them up).
    from app.models.operations import Assessment

    own = Assessment(
        school_id=ctx["school"].id, subject_id=ctx["math"].id, classroom_id=ctx["classroom_a"].id,
        term_id=ctx["term"].id, libelle="Math A", date=date(2026, 10, 1), coefficient=1,
    )
    wrong_subject = Assessment(
        school_id=ctx["school"].id, subject_id=ctx["french"].id, classroom_id=ctx["classroom_a"].id,
        term_id=ctx["term"].id, libelle="Français A", date=date(2026, 10, 1), coefficient=1,
    )
    wrong_classroom = Assessment(
        school_id=ctx["school"].id, subject_id=ctx["math"].id, classroom_id=ctx["classroom_b"].id,
        term_id=ctx["term"].id, libelle="Math B", date=date(2026, 10, 1), coefficient=1,
    )
    db_session.add_all([own, wrong_subject, wrong_classroom])
    db_session.commit()

    _login_teacher(client, ctx["school"].id)

    ok = client.put(
        "/api/v1/grades",
        json={"records": [{"assessment_id": own.id, "student_id": ctx["student"].id, "note": 15}]},
    )
    assert ok.status_code == 200

    for bad_assessment in (wrong_subject, wrong_classroom):
        resp = client.put(
            "/api/v1/grades",
            json={"records": [{"assessment_id": bad_assessment.id, "student_id": ctx["student"].id, "note": 10}]},
        )
        assert resp.status_code == 403


def test_teacher_attendance_scoped_but_secretary_is_not(client, db_session):
    ctx = _setup(db_session)
    _login_teacher(client, ctx["school"].id)

    ok = client.put(
        "/api/v1/attendance",
        json={
            "records": [
                {"student_id": ctx["student"].id, "classroom_id": ctx["classroom_a"].id, "date": "2026-10-01", "statut": "present"}
            ]
        },
    )
    assert ok.status_code == 200

    forbidden = client.put(
        "/api/v1/attendance",
        json={
            "records": [
                {"student_id": ctx["student"].id, "classroom_id": ctx["classroom_b"].id, "date": "2026-10-01", "statut": "present"}
            ]
        },
    )
    assert forbidden.status_code == 403

    client.post("/api/v1/auth/logout")
    secretary_user = User(
        school_id=ctx["school"].id, nom="Secrétaire", email="secretary@test.cd",
        password_hash=hash_password("password123"), telephone="", role=Role.secretary, statut=UserStatus.actif,
    )
    db_session.add(secretary_user)
    db_session.commit()
    secretary_login = client.post(
        "/api/v1/auth/login",
        json={"email": "secretary@test.cd", "password": "password123", "school_id": ctx["school"].id},
    )
    assert secretary_login.status_code == 200

    secretary_ok = client.put(
        "/api/v1/attendance",
        json={
            "records": [
                {"student_id": ctx["student"].id, "classroom_id": ctx["classroom_b"].id, "date": "2026-10-02", "statut": "absent"}
            ]
        },
    )
    assert secretary_ok.status_code == 200
