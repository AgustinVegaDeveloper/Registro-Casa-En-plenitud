from sqlalchemy.orm import Session

from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate


def get_members(db: Session) -> list[Member]:
    return db.query(Member).order_by(Member.last_name.asc(), Member.first_name.asc()).all()


def get_member_by_id(db: Session, member_id: int) -> Member | None:
    return db.query(Member).filter(Member.id == member_id).first()


def get_member_by_document(db: Session, document: str) -> Member | None:
    return db.query(Member).filter(Member.document == document).first()


def create_member(db: Session, payload: MemberCreate) -> Member:
    member = Member(**payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def update_member(db: Session, member: Member, payload: MemberUpdate) -> Member:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, field, value)

    db.commit()
    db.refresh(member)
    return member


def delete_member(db: Session, member: Member) -> None:
    db.delete(member)
    db.commit()

