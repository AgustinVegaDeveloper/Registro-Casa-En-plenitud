from app.core.config import settings
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.auth import Role, UserRole
from app.models.membership import ChurchRole
from app.models.user import User

SYSTEM_ROLES = [
    ("admin", "Administrador"),
    ("advisor", "Asesor"),
    ("leader", "Lider"),
    ("collaborator", "Colaborador"),
]

CHURCH_ROLES = [
    ("main_leader", "Lider Principal"),
    ("evangelist_partner", "Par Evangelista"),
    ("host", "Anfitrion"),
    ("assistant_leader", "Asistente de Lider"),
    ("emerging_leader", "Lider Emergente"),
    ("member", "Integrante"),
]


def seed_roles(db: Session) -> None:
    for code, name in SYSTEM_ROLES:
        if not db.query(Role).filter(Role.code == code).first():
            db.add(Role(code=code, name=name))

    for code, name in CHURCH_ROLES:
        if not db.query(ChurchRole).filter(ChurchRole.code == code).first():
            db.add(ChurchRole(code=code, name=name))

    db.commit()


def seed_admin_user(db: Session) -> None:
    admin = db.query(User).filter(User.username == settings.initial_admin_username).first()
    if admin:
        return

    admin = User(
        username=settings.initial_admin_username,
        email=settings.initial_admin_email,
        hashed_password=get_password_hash(settings.initial_admin_password),
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    admin_role = db.query(Role).filter(Role.code == "admin").first()
    if admin_role and not db.query(UserRole).filter(UserRole.user_id == admin.id, UserRole.role_id == admin_role.id).first():
        db.add(UserRole(user_id=admin.id, role_id=admin_role.id))
        db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_admin_user(db)
        print("Seed completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
