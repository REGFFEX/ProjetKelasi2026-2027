"""Seed the database with a realistic DRC-context demo dataset, now reflecting
the full Cycle -> Level -> Classroom hierarchy, year-scoped enrollments and
teacher assignments, and configurable evaluation types. Run with: python -m app.seed
"""
from datetime import date

from app.db import SessionLocal
from app.models.academic import AcademicYear, AcademicYearStatus, Term, Cycle, Level, EvaluationMode
from app.models.finance import Invoice, InvoiceStatus, Payment, PaymentMethod, FeeType
from app.models.operations import Assessment, Attendance, AttendanceStatus, EvaluationType, Grade, GradeStatus
from app.models.people import (
    Classroom,
    Enrollment,
    Parent,
    Student,
    StudentParent,
    Subject,
    Teacher,
    TeacherAssignment,
)
from app.models.school import School, SubscriptionStatus
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(School).first():
            print("Database already seeded, skipping.")
            return

        school = School(
            nom="École Mixte Lumumba",
            adresse="Av. de la Victoire, Kinshasa",
            telephone="+243 81 234 5678",
            statut_abonnement=SubscriptionStatus.actif,
            date_creation=date(2021, 9, 1),
        )
        db.add(school)
        db.flush()

        demo_users = [
            ("Joseph Kabasele", "joseph.kabasele@kelasi.com", "Admin@2026", Role.school_admin, "+243 81 000 0001"),
            ("Marie Kalala", "marie.kalala@kelasi.com", "Secret@2026", Role.secretary, "+243 81 000 0002"),
            ("Pierre Mbuyi", "pierre.mbuyi@kelasi.com", "Compta@2026", Role.accountant, "+243 81 000 0003"),
            ("Esther Tshala", "esther.tshala@kelasi.com", "Prof@2026", Role.teacher, "+243 81 555 6666"),
            ("Jean Mukendi", "jean.mukendi@kelasi.com", "Parent@2026", Role.parent, "+243 81 234 5678"),
        ]
        users = {}
        for nom, email, password, role, telephone in demo_users:
            u = User(
                school_id=school.id,
                nom=nom,
                email=email,
                password_hash=hash_password(password),
                telephone=telephone,
                role=role,
                statut=UserStatus.actif,
            )
            db.add(u)
            db.flush()
            users[email] = u

        # ── Academic year & term (created early — everything below hangs off it) ──
        academic_year = AcademicYear(
            school_id=school.id,
            libelle="2026-2027",
            date_debut=date(2026, 9, 1),
            date_fin=date(2027, 7, 15),
            statut=AcademicYearStatus.active,
        )
        db.add(academic_year)
        db.flush()

        term1 = Term(
            school_id=school.id,
            academic_year_id=academic_year.id,
            libelle="1er Trimestre",
            date_debut=date(2026, 9, 1),
            date_fin=date(2026, 12, 15),
        )
        db.add(term1)
        db.flush()

        # ── École → Cycle → Niveau hierarchy ──
        cycle_defs = [
            ("Maternelle", EvaluationMode.qualitatif),
            ("Primaire", EvaluationMode.notes),
            ("Secondaire", EvaluationMode.notes),
        ]
        cycles = {}
        for nom, mode in cycle_defs:
            c = Cycle(school_id=school.id, nom=nom, ordre=len(cycles), evaluation_mode=mode)
            db.add(c)
            db.flush()
            cycles[nom] = c

        level_defs = [
            ("1ère Maternelle", "Maternelle"),
            ("6ème Primaire", "Primaire"),
            ("1ère Humanités", "Secondaire"),
            ("2ème Humanités", "Secondaire"),
            ("4ème Humanités", "Secondaire"),
        ]
        levels = {}
        for nom, cycle_nom in level_defs:
            lvl = Level(school_id=school.id, cycle_id=cycles[cycle_nom].id, nom=nom, ordre=len(levels))
            db.add(lvl)
            db.flush()
            levels[nom] = lvl

        subject_defs = [
            ("Mathématiques", 4),
            ("Français", 4),
            ("Histoire-Géographie", 2),
            ("Sciences", 3),
            ("Anglais", 2),
            ("EPS", 1),
            ("Informatique", 2),
            ("Religion", 1),
            ("Éducation artistique", 1),
        ]
        subjects = {}
        for nom, coeff in subject_defs:
            s = Subject(school_id=school.id, nom=nom, coefficient=coeff)
            db.add(s)
            db.flush()
            subjects[nom] = s

        evaluation_type_defs = ["Devoir", "Interrogation", "Composition", "Examen", "Projet", "Oral", "Participation"]
        eval_types = {}
        for nom in evaluation_type_defs:
            et = EvaluationType(school_id=school.id, nom=nom)
            db.add(et)
            db.flush()
            eval_types[nom] = et

        teacher_defs = [
            ("Tshala", "Esther", "esther.tshala@kelasi.com", "+243 81 555 6666"),
            ("Mpeza", "David", "david.mpeza@kelasi.cd", "+243 81 999 1010"),
            ("Nkulu", "Sarah", "sarah.nkulu@kelasi.cd", "+243 82 121 3141"),
            ("Bakwa", "Michel", "michel.bakwa@kelasi.cd", "+243 82 343 5454"),
            ("Mbuyi", "Jeanne", "jeanne.mbuyi@kelasi.cd", "+243 81 565 6767"),
        ]
        teachers = {}
        for nom, prenom, email, tel in teacher_defs:
            t = Teacher(
                school_id=school.id,
                user_id=users.get(email).id if email in users else None,
                nom=nom,
                prenom=prenom,
                email=email,
                telephone=tel,
            )
            db.add(t)
            db.flush()
            teachers[prenom] = t

        classroom_defs = [
            ("1ère Maternelle", "1ère Maternelle", "Salle M1", "Jeanne", None),
            ("6ème Primaire", "6ème Primaire A", "Salle P6A", "Esther", None),
            ("6ème Primaire", "6ème Primaire B", "Salle P6B", "Sarah", None),
            ("1ère Humanités", "1ère Humanités Math-Physique", "Salle H1MP", "Esther", "Math-Physique"),
            ("2ème Humanités", "2ème Humanités Littéraire", "Salle H2L", "Michel", "Littéraire"),
            ("4ème Humanités", "4ème Humanités Chim-Bio", "Salle H4CB", "David", "Chimie-Biologie"),
        ]
        classrooms = []
        for level_nom, nom, salle, principal_prenom, filiere in classroom_defs:
            c = Classroom(
                school_id=school.id,
                level_id=levels[level_nom].id,
                nom=nom,
                salle=salle,
                filiere=filiere,
                enseignant_principal_id=teachers[principal_prenom].id,
            )
            db.add(c)
            db.flush()
            classrooms.append(c)
        classroom_by_nom = {c.nom: c for c in classrooms}

        # ── Teacher assignments: precise (teacher, subject, classroom, year) triples ──
        assignment_defs = [
            ("Esther", "Mathématiques", "6ème Primaire A"),
            ("Esther", "Mathématiques", "1ère Humanités Math-Physique"),
            ("Esther", "Informatique", "1ère Humanités Math-Physique"),
            ("David", "Français", "6ème Primaire A"),
            ("David", "Français", "6ème Primaire B"),
            ("David", "Anglais", "4ème Humanités Chim-Bio"),
            ("Sarah", "Sciences", "6ème Primaire A"),
            ("Sarah", "Sciences", "6ème Primaire B"),
            ("Sarah", "Sciences", "4ème Humanités Chim-Bio"),
            ("Michel", "Histoire-Géographie", "2ème Humanités Littéraire"),
            ("Michel", "Histoire-Géographie", "1ère Humanités Math-Physique"),
            ("Jeanne", "EPS", "1ère Humanités Math-Physique"),
            ("Jeanne", "Éducation artistique", "1ère Maternelle"),
        ]
        for prenom, subject_nom, classroom_nom in assignment_defs:
            db.add(
                TeacherAssignment(
                    school_id=school.id,
                    teacher_id=teachers[prenom].id,
                    subject_id=subjects[subject_nom].id,
                    classroom_id=classroom_by_nom[classroom_nom].id,
                    academic_year_id=academic_year.id,
                )
            )

        parent_defs = [
            ("Jean Mukendi", "+243 81 234 5678", "jean.m@gmail.com", "Matonge, Kinshasa", "Commerçant", "jean.mukendi@kelasi.com"),
            ("Adèle Kabongo", "+243 82 345 6789", "adele.k@gmail.com", "Lemba, Kinshasa", "Infirmière", None),
            ("Félix Mwamba", "+243 85 456 7890", "felix.m@gmail.com", "Bandalungwa, Kinshasa", "Chauffeur", None),
            ("Claire Ntumba", "+243 89 567 8901", "claire.n@gmail.com", "Ngaliema, Kinshasa", "Enseignante", None),
            ("Patrick Ilunga", "+243 81 678 9012", "patrick.i@gmail.com", "Kintambo, Kinshasa", "Mécanicien", None),
        ]
        parents = []
        for nom, tel, email, adresse, profession, user_email in parent_defs:
            p = Parent(
                school_id=school.id,
                user_id=users[user_email].id if user_email else None,
                nom=nom,
                telephone=tel,
                email=email,
                adresse=adresse,
                profession=profession,
            )
            db.add(p)
            db.flush()
            parents.append(p)

        student_defs = [
            ("MAT-2026-001", "Mukendi", "Aimé", date(2015, 3, 12), "6ème Primaire A", parents[0]),
            ("MAT-2026-002", "Kabongo", "Béatrice", date(2015, 7, 22), "6ème Primaire A", parents[1]),
            ("MAT-2026-003", "Mwamba", "Christian", date(2014, 11, 5), "6ème Primaire B", parents[2]),
            ("MAT-2026-004", "Ntumba", "Divine", date(2015, 1, 18), "6ème Primaire A", parents[3]),
            ("MAT-2026-005", "Ilunga", "Emmanuel", date(2012, 9, 30), "4ème Humanités Chim-Bio", parents[4]),
        ]
        students = []
        for matricule, nom, prenom, dob, classroom_nom, parent in student_defs:
            st = Student(
                school_id=school.id,
                matricule=matricule,
                nom=nom,
                prenom=prenom,
                date_naissance=dob,
                statut=UserStatus.actif,
            )
            db.add(st)
            db.flush()
            db.add(
                Enrollment(
                    school_id=school.id,
                    student_id=st.id,
                    classroom_id=classroom_by_nom[classroom_nom].id,
                    academic_year_id=academic_year.id,
                )
            )
            db.add(StudentParent(school_id=school.id, student_id=st.id, parent_id=parent.id))
            students.append(st)

        today = date.today()
        for idx, st in enumerate(students):
            statut = (
                AttendanceStatus.absent
                if idx % 7 == 0
                else AttendanceStatus.retard
                if idx % 5 == 0
                else AttendanceStatus.justifie
                if idx % 9 == 0
                else AttendanceStatus.present
            )
            enrolled_classroom_id = classroom_by_nom[student_defs[idx][4]].id
            db.add(
                Attendance(
                    school_id=school.id,
                    student_id=st.id,
                    classroom_id=enrolled_classroom_id,
                    date=today,
                    statut=statut,
                )
            )

        # Assessments only for classrooms/subjects an assignment actually covers,
        # so the teacher-scoping demo (Esther) has real, gradeable data.
        assessment_defs = [
            (subjects["Mathématiques"], classroom_by_nom["6ème Primaire A"], eval_types["Interrogation"], "Interrogation Math 1", 1),
            (subjects["Français"], classroom_by_nom["6ème Primaire A"], eval_types["Examen"], "Examen Français T1", 2),
            (subjects["Sciences"], classroom_by_nom["4ème Humanités Chim-Bio"], eval_types["Projet"], "TP Physique-Chimie", 1),
        ]
        assessments = []
        for subject, classroom, eval_type, libelle, coeff in assessment_defs:
            a = Assessment(
                school_id=school.id,
                subject_id=subject.id,
                classroom_id=classroom.id,
                term_id=term1.id,
                evaluation_type_id=eval_type.id,
                libelle=libelle,
                date=today,
                coefficient=coeff,
            )
            db.add(a)
            db.flush()
            assessments.append(a)

        grade_defs = [
            (assessments[0], students[0], 16.5),
            (assessments[0], students[1], 14.0),
            (assessments[0], students[3], 18.0),
            (assessments[1], students[0], 15.0),
            (assessments[1], students[1], 13.5),
            (assessments[2], students[4], 17.5),
        ]
        for assessment, student, note in grade_defs:
            db.add(
                Grade(
                    school_id=school.id,
                    assessment_id=assessment.id,
                    student_id=student.id,
                    note=note,
                    statut_validation=GradeStatus.valide,
                )
            )

        invoice_defs = [
            (students[0], FeeType.scolarite, 150000, 150000, 0, InvoiceStatus.paye),
            (students[1], FeeType.scolarite, 150000, 100000, 50000, InvoiceStatus.partiel),
            (students[2], FeeType.scolarite, 150000, 0, 150000, InvoiceStatus.impaye),
            (students[3], FeeType.cantine, 45000, 45000, 0, InvoiceStatus.paye),
            (students[4], FeeType.transport, 60000, 30000, 30000, InvoiceStatus.partiel),
        ]
        invoices = []
        for student, type_frais, total, paye, reste, statut in invoice_defs:
            inv = Invoice(
                school_id=school.id,
                student_id=student.id,
                type_frais=type_frais,
                montant_total=total,
                montant_paye=paye,
                reste_a_payer=reste,
                date_emission=date(2026, 9, 1),
                statut=statut,
            )
            db.add(inv)
            db.flush()
            invoices.append(inv)

        payment_defs = [
            (invoices[0], 150000, PaymentMethod.mobile_money, False),
            (invoices[1], 100000, PaymentMethod.especes, True),
            (invoices[3], 45000, PaymentMethod.carte_bancaire, False),
            (invoices[4], 30000, PaymentMethod.mobile_money, True),
        ]
        for invoice, montant, mode, partiel in payment_defs:
            db.add(
                Payment(
                    school_id=school.id,
                    invoice_id=invoice.id,
                    montant=montant,
                    date_paiement=today,
                    mode_paiement=mode,
                    partiel=partiel,
                )
            )

        db.commit()
        print(f"Seeded school {school.id} with {len(students)} students, {len(teachers)} teachers.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
