from datetime import date, timedelta
from random import choice, randint, random

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.attendance import AttendanceRecord, Meeting
from app.models.auth import Role, UserRole
from app.models.cell import Cell
from app.models.member import Member
from app.models.membership import CellMemberRole, CellMembership, ChurchRole
from app.models.network import Network, NetworkAdvisor
from app.models.user import User

DEMO_NETWORKS = [
    {"network_number": 1, "name": "Red de Crecimiento", "network_type": "growth"},
    {"network_number": 2, "name": "Red de Consolidación", "network_type": "consolidation"},
    {"network_number": 3, "name": "Red de Transición", "network_type": "transition"},
]

DEMO_CELLS: list[dict] = [
    {"network_number": 1, "name": "Célula Betel", "is_active": True},
    {"network_number": 1, "name": "Célula Getsemaní", "is_active": True},
    {"network_number": 1, "name": "Célula Galilea", "is_active": False},
    {"network_number": 2, "name": "Célula Sión", "is_active": True},
    {"network_number": 2, "name": "Célula Emaús", "is_active": True},
    {"network_number": 3, "name": "Célula Jericó", "is_active": True},
]

DEMO_MEMBERS = [
    {"document": "CC-12345678", "first_name": "Carlos", "last_name": "Méndez López", "phone": "3001112233", "neighborhood": "El Prado", "birth_date": date(1985, 3, 15)},
    {"document": "CC-23456789", "first_name": "María", "last_name": "García Torres", "phone": "3002223344", "neighborhood": "Buenos Aires", "birth_date": date(1990, 7, 22)},
    {"document": "CC-34567890", "first_name": "Pedro", "last_name": "Ramírez Sánchez", "phone": "3003334455", "neighborhood": "Centro", "birth_date": date(1978, 11, 10)},
    {"document": "CC-45678901", "first_name": "Ana", "last_name": "Martínez Ruiz", "phone": "3004445566", "neighborhood": "Buenos Aires", "birth_date": date(1995, 2, 28)},
    {"document": "CC-56789012", "first_name": "José", "last_name": "Hernández Díaz", "phone": "3005556677", "neighborhood": "Villa María", "birth_date": date(1982, 6, 5)},
    {"document": "CC-67890123", "first_name": "Laura", "last_name": "Pérez Gómez", "phone": "3006667788", "neighborhood": "El Prado", "birth_date": date(1993, 9, 18)},
    {"document": "CC-78901234", "first_name": "Luis", "last_name": "Álvarez Castro", "phone": "3007778899", "neighborhood": "Centro", "birth_date": date(1987, 4, 12)},
    {"document": "CC-89012345", "first_name": "Sofía", "last_name": "Torres Medina", "phone": "3008889900", "neighborhood": "Villa María", "birth_date": date(1991, 12, 1)},
    {"document": "CC-90123456", "first_name": "Andrés", "last_name": "Morales Vega", "phone": "3009990011", "neighborhood": "Los Álamos", "birth_date": date(1980, 8, 25)},
    {"document": "CC-01234567", "first_name": "Valentina", "last_name": "Cruz Rojas", "phone": "3010001122", "neighborhood": "Los Álamos", "birth_date": date(1996, 5, 14)},
    {"document": "CC-11223344", "first_name": "Diego", "last_name": "Ortiz Navarro", "phone": "3011112233", "neighborhood": "El Prado", "birth_date": date(1984, 10, 30)},
    {"document": "CC-22334455", "first_name": "Camila", "last_name": "Silva Herrera", "phone": "3012223344", "neighborhood": "Buenos Aires", "birth_date": date(1989, 1, 8)},
    {"document": "CC-33445566", "first_name": "Jorge", "last_name": "Reyes Castillo", "phone": "3013334455", "neighborhood": "Centro", "birth_date": date(1975, 6, 20)},
    {"document": "CC-44556677", "first_name": "Isabella", "last_name": "Peña Flores", "phone": "3014445566", "neighborhood": "Villa María", "birth_date": date(1998, 3, 3)},
    {"document": "CC-55667788", "first_name": "Fernando", "last_name": "Delgado Muñoz", "phone": "3015556677", "neighborhood": "El Prado", "birth_date": date(1983, 7, 16)},
]

DEMO_USERS = [
    {"username": "asesor1", "email": "asesor1@iglesia.local", "password": "Asesor1234", "role": "advisor"},
    {"username": "lider1", "email": "lider1@iglesia.local", "password": "Lider1234", "role": "leader"},
    {"username": "colab1", "email": "colab1@iglesia.local", "password": "Colab1234", "role": "collaborator"},
]

NEIGHBORHOODS = ["El Prado", "Buenos Aires", "Centro", "Villa María", "Los Álamos"]
ADDRESSES = ["Calle 10 #5-20", "Cra 8 #15-42", "Av 3 #22-11", "Calle 25 #8-33", "Cra 12 #4-18", "Calle 7 #30-15"]
CHURCH_ROLES_ORDER = ["main_leader", "evangelist_partner", "host", "assistant_leader", "emerging_leader", "member"]

STATUS_WEIGHTS = ["P", "P", "P", "P", "P", "P", "P", "R", "R", "N", "E"]
EXCUSE_REASONS = ["illness", "travel", "work", "study", "other"]

TODAY = date.today()


def get_cell_number(db: Session, network_id: int) -> int:
    max_num = db.query(Cell.cell_number).filter(Cell.network_id == network_id).order_by(Cell.cell_number.desc()).first()
    return (max_num[0] + 1) if max_num else 1


def seed_networks_and_cells(db: Session) -> dict[int, list[Cell]]:
    network_cells: dict[int, list[Cell]] = {}
    for net_data in DEMO_NETWORKS:
        network = db.query(Network).filter(Network.network_number == net_data["network_number"]).first()
        if not network:
            network = Network(network_number=net_data["network_number"], name=net_data["name"], network_type=net_data["network_type"])
            db.add(network)
            db.flush()
        network_cells[network.id] = []
        for cell_data in DEMO_CELLS:
            if cell_data["network_number"] != net_data["network_number"]:
                continue
            cell = db.query(Cell).filter(Cell.network_id == network.id, Cell.name == cell_data["name"]).first()
            if cell:
                network_cells[network.id].append(cell)
                continue
            cell_number = get_cell_number(db, network.id)
            code = f"{network.network_number}.{cell_number}"
            cell = Cell(network_id=network.id, cell_number=cell_number, code=code, name=cell_data["name"], is_active=cell_data["is_active"])
            db.add(cell)
            db.flush()
            network_cells[network.id].append(cell)
    db.commit()
    return network_cells


def seed_members(db: Session) -> list[Member]:
    created: list[Member] = []
    for m in DEMO_MEMBERS:
        existing = db.query(Member).filter(Member.document == m["document"]).first()
        if existing:
            created.append(existing)
            continue
        member = Member(document=m["document"], first_name=m["first_name"], last_name=m["last_name"], birth_date=m["birth_date"], phone=m["phone"], address=choice(ADDRESSES), neighborhood=choice(NEIGHBORHOODS), church_join_date=TODAY - timedelta(days=randint(90, 730)), first_cell_join_date=TODAY - timedelta(days=randint(30, 365)))
        db.add(member)
        db.flush()
        created.append(member)
    db.commit()
    return created


def seed_memberships(db: Session, members: list[Member], network_cells: dict[int, list[Cell]]) -> list[CellMembership]:
    all_cells = [c for cells in network_cells.values() for c in cells if c.is_active]
    created: list[CellMembership] = []
    for idx, member in enumerate(members):
        cell = all_cells[idx % len(all_cells)]
        existing = db.query(CellMembership).filter(CellMembership.member_id == member.id, CellMembership.cell_id == cell.id).first()
        if existing:
            created.append(existing)
            continue
        start = TODAY - timedelta(days=randint(30, 365))
        membership = CellMembership(member_id=member.id, cell_id=cell.id, start_date=start, end_date=None)
        db.add(membership)
        db.flush()
        created.append(membership)
    db.commit()
    return created


def seed_cell_roles(db: Session, memberships: list[CellMembership]) -> None:
    role_map = {rc: db.query(ChurchRole).filter(ChurchRole.code == rc).first() for rc in CHURCH_ROLES_ORDER}
    used_memberships = set()

    def assign_role(membership: CellMembership, role_code: str) -> None:
        if membership.id in used_memberships:
            return
        church_role = role_map.get(role_code)
        if not church_role:
            return
        existing = db.query(CellMemberRole).filter(CellMemberRole.membership_id == membership.id, CellMemberRole.role_id == church_role.id).first()
        if existing:
            return
        db.add(CellMemberRole(membership_id=membership.id, role_id=church_role.id, start_date=membership.start_date))
        used_memberships.add(membership.id)

    for idx, ms in enumerate(memberships):
        if idx == 0:
            assign_role(ms, "main_leader")
        elif idx == 1:
            assign_role(ms, "evangelist_partner")
        elif idx == 2:
            assign_role(ms, "host")
        elif idx == 3:
            assign_role(ms, "assistant_leader")
        elif idx == 4:
            assign_role(ms, "emerging_leader")
        else:
            assign_role(ms, "member")
    db.commit()


def seed_demo_users(db: Session) -> None:
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        return

    for user_data in DEMO_USERS:
        user = db.query(User).filter(User.username == user_data["username"]).first()
        if user:
            continue
        user = User(username=user_data["username"], email=user_data["email"], hashed_password=get_password_hash(user_data["password"]), is_active=True)
        db.add(user)
        db.flush()
        role = db.query(Role).filter(Role.code == user_data["role"]).first()
        if role:
            db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()


def seed_network_advisors(db: Session) -> None:
    advisor_user = db.query(User).filter(User.username == "asesor1").first()
    if not advisor_user:
        return
    networks = db.query(Network).order_by(Network.id).all()
    for idx, network in enumerate(networks):
        existing = db.query(NetworkAdvisor).filter(NetworkAdvisor.network_id == network.id).first()
        if existing:
            continue
        slot = (idx % 2) + 1
        db.add(NetworkAdvisor(network_id=network.id, user_id=advisor_user.id, advisor_slot=slot))
    db.commit()


def seed_meetings_and_attendance(db: Session, memberships: list[CellMembership]) -> None:
    cell_ids = list({ms.cell_id for ms in memberships})
    now = TODAY
    for months_ago in range(1, 5):
        for cell_id in cell_ids:
            for _ in range(1 if months_ago > 2 else 2):
                meeting_date = now.replace(day=1) - timedelta(days=months_ago * 30 + randint(0, 25))
                meeting_type = "cell_meeting" if random() > 0.3 else "weekend_service"
                existing = db.query(Meeting).filter(Meeting.cell_id == cell_id, Meeting.meeting_date == meeting_date, Meeting.meeting_type == meeting_type).first()
                if existing:
                    continue
                meeting = Meeting(cell_id=cell_id, meeting_type=meeting_type, meeting_date=meeting_date)
                db.add(meeting)
                db.flush()
                for ms in memberships:
                    if ms.cell_id != cell_id:
                        continue
                    existing_rec = db.query(AttendanceRecord).filter(AttendanceRecord.meeting_id == meeting.id, AttendanceRecord.member_id == ms.member_id).first()
                    if existing_rec:
                        continue
                    status = choice(STATUS_WEIGHTS)
                    excuse_reason = None
                    excuse_text = None
                    if status == "E":
                        excuse_reason = choice(EXCUSE_REASONS)
                        excuse_text = {"illness": "Problemas de salud", "travel": "Viaje familiar", "work": "Compromiso laboral", "study": "Exámenes", "other": "Asunto personal"}.get(excuse_reason)
                    record = AttendanceRecord(meeting_id=meeting.id, member_id=ms.member_id, membership_id=ms.id, status=status, excuse_reason=excuse_reason, excuse_text=excuse_text)
                    db.add(record)
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        print("Seeding demo data...")
        print("  Networks & cells...")
        network_cells = seed_networks_and_cells(db)
        print("  Members...")
        members = seed_members(db)
        print("  Memberships...")
        memberships = seed_memberships(db, members, network_cells)
        print("  Cell roles...")
        seed_cell_roles(db, memberships)
        print("  Demo users (asesor1, lider1, colab1)...")
        seed_demo_users(db)
        print("  Network advisors...")
        seed_network_advisors(db)
        print("  Meetings & attendance (4 months)...")
        seed_meetings_and_attendance(db, memberships)
        print("Demo data seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
