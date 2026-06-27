from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_admin, require_advisor, require_collaborator
from app.models.network import Network
from app.schemas.network import NetworkCreate, NetworkRead, NetworkUpdate
from app.services.network_crud_service import (
    create_network,
    delete_network,
    get_network_by_id,
    get_networks,
    update_network,
)

router = APIRouter(prefix="/networks", tags=["networks"])


@router.get("", response_model=list[NetworkRead], dependencies=[Depends(require_collaborator)])
def list_networks(db: Session = Depends(get_db_session)):
    return get_networks(db)


@router.get("/{network_id}", response_model=NetworkRead, dependencies=[Depends(require_collaborator)])
def read_network(network_id: int, db: Session = Depends(get_db_session)):
    network = get_network_by_id(db, network_id)
    if network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    return network


@router.post("", response_model=NetworkRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_network_endpoint(payload: NetworkCreate, db: Session = Depends(get_db_session)):
    return create_network(db, payload)


@router.put("/{network_id}", response_model=NetworkRead, dependencies=[Depends(require_admin)])
def update_network_endpoint(network_id: int, payload: NetworkUpdate, db: Session = Depends(get_db_session)):
    network = get_network_by_id(db, network_id)
    if network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    return update_network(db, network, payload)


@router.delete("/{network_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_network_endpoint(network_id: int, db: Session = Depends(get_db_session)):
    network = get_network_by_id(db, network_id)
    if network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    delete_network(db, network)

