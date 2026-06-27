from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.user import User
from app.schemas.cell_summary import CellSummaryRead
from app.services.authorization_service import can_access_cell
from app.services.cell_summary_service import get_cell_summary

router = APIRouter(prefix="/cells", tags=["cells"])


@router.get("/{cell_id}/summary", response_model=CellSummaryRead)
def read_cell_summary(
    cell_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    if not can_access_cell(db, current_user, cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")

    summary = get_cell_summary(db, cell_id)
    if summary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cell not found")

    return summary

