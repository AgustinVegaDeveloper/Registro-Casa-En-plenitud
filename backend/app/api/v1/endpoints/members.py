from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, require_collaborator
from app.models.user import User
from app.schemas.member import MemberCreate, MemberRead, MemberUpdate
from app.services.member_crud_service import (
    create_member,
    delete_member,
    get_member_by_document,
    get_member_by_id,
    get_members,
    update_member,
)
from app.utils.image import process_photo, remove_photo

router = APIRouter(prefix="/members", tags=["members"])

MAX_PHOTO_SIZE = 5 * 1024 * 1024


@router.get("", response_model=list[MemberRead], dependencies=[Depends(require_collaborator)])
def list_members(db: Session = Depends(get_db_session)):
    return get_members(db)


@router.get("/{member_id}", response_model=MemberRead, dependencies=[Depends(require_collaborator)])
def read_member(member_id: int, db: Session = Depends(get_db_session)):
    member = get_member_by_id(db, member_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return member


@router.post("", response_model=MemberRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_collaborator)])
def create_member_endpoint(
    payload: MemberCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    existing_member = get_member_by_document(db, payload.document)
    if existing_member is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Document already exists")
    return create_member(db, payload)


@router.put("/{member_id}", response_model=MemberRead, dependencies=[Depends(require_collaborator)])
def update_member_endpoint(member_id: int, payload: MemberUpdate, db: Session = Depends(get_db_session)):
    member = get_member_by_id(db, member_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return update_member(db, member, payload)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_collaborator)])
def delete_member_endpoint(member_id: int, db: Session = Depends(get_db_session)):
    member = get_member_by_id(db, member_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    delete_member(db, member)


@router.post("/{member_id}/photo", response_model=MemberRead, dependencies=[Depends(require_collaborator)])
def upload_member_photo(
    member_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
):
    member = get_member_by_id(db, member_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")

    contents = file.file.read()
    if len(contents) > MAX_PHOTO_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Photo must be under {MAX_PHOTO_SIZE // (1024 * 1024)} MB")

    if member.photo_path:
        remove_photo(member.photo_path)

    filename = process_photo(contents, file.filename or "photo.jpg")
    member.photo_path = filename
    db.commit()
    db.refresh(member)
    return member

