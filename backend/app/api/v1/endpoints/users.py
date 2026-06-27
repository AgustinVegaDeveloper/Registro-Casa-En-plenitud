from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, require_admin
from app.models.user import User
from app.schemas.user import (
    AdminPasswordSet,
    CellAccessCreate,
    CellAccessRead,
    NetworkAdvisorCreate,
    NetworkAdvisorRead,
    PasswordChange,
    UserCreate,
    UserRead,
    UserRoleAssignment,
    UserUpdate,
)
from app.services.user_service import (
    assign_cell_access,
    assign_network_advisor,
    assign_role,
    change_password,
    admin_set_password,
    create_user,
    delete_user,
    get_cell_accesses,
    get_network_advisors,
    get_user_by_id,
    get_users,
    remove_cell_access,
    remove_network_advisor,
    remove_role,
    update_user,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead], dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db_session)):
    return get_users(db)


@router.get("/{user_id}", response_model=UserRead, dependencies=[Depends(require_admin)])
def read_user(user_id: int, db: Session = Depends(get_db_session)):
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_user_endpoint(payload: UserCreate, db: Session = Depends(get_db_session)):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    user = create_user(db, payload)
    return get_user_by_id(db, user.id)


@router.put("/{user_id}", response_model=UserRead, dependencies=[Depends(require_admin)])
def update_user_endpoint(user_id: int, payload: UserUpdate, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    update_user(db, user, payload)
    result = get_user_by_id(db, user_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return result


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_user_endpoint(user_id: int, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    delete_user(db, user)


@router.post("/{user_id}/roles", dependencies=[Depends(require_admin)])
def assign_user_role(user_id: int, payload: UserRoleAssignment, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        role_codes = assign_role(db, user, payload.role_code)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    return {"role_codes": role_codes}


@router.delete("/{user_id}/roles/{role_code}", dependencies=[Depends(require_admin)])
def remove_user_role(user_id: int, role_code: str, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        role_codes = remove_role(db, user, role_code)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    return {"role_codes": role_codes}


@router.post("/{user_id}/password", dependencies=[Depends(require_admin)])
def set_user_password(user_id: int, payload: AdminPasswordSet, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    admin_set_password(db, user, payload.new_password)
    return {"detail": "Password updated successfully"}


@router.get("/{user_id}/advisors", response_model=list[NetworkAdvisorRead], dependencies=[Depends(require_admin)])
def list_user_advisors(user_id: int, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return get_network_advisors(db, user)


@router.post("/{user_id}/advisors", dependencies=[Depends(require_admin)])
def create_user_advisor(user_id: int, payload: NetworkAdvisorCreate, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        result = assign_network_advisor(db, user, payload.network_id)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    return result


@router.delete("/{user_id}/advisors/{network_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_user_advisor(user_id: int, network_id: int, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    remove_network_advisor(db, user, network_id)


@router.get("/{user_id}/cell-access", response_model=list[CellAccessRead], dependencies=[Depends(require_admin)])
def list_user_cell_access(user_id: int, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return get_cell_accesses(db, user)


@router.post("/{user_id}/cell-access", dependencies=[Depends(require_admin)])
def create_user_cell_access(user_id: int, payload: CellAccessCreate, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        result = assign_cell_access(db, user, payload.cell_id, payload.role_code)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    return result


@router.delete("/{user_id}/cell-access/{access_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_user_cell_access(user_id: int, access_id: int, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    remove_cell_access(db, user, access_id)


@router.post("/me/password", dependencies=[Depends(get_current_user)])
def change_own_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    try:
        change_password(db, current_user, payload.current_password, payload.new_password)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    return {"detail": "Password updated successfully"}
