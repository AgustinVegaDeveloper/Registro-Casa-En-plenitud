from sqlalchemy.orm import Session

from app.models.network import Network
from app.schemas.network import NetworkCreate, NetworkUpdate


def get_networks(db: Session) -> list[Network]:
    return db.query(Network).order_by(Network.network_number.asc()).all()


def get_network_by_id(db: Session, network_id: int) -> Network | None:
    return db.query(Network).filter(Network.id == network_id).first()


def create_network(db: Session, payload: NetworkCreate) -> Network:
    network = Network(
        network_number=payload.network_number,
        name=payload.name,
        network_type=payload.network_type,
    )
    db.add(network)
    db.commit()
    db.refresh(network)
    return network


def update_network(db: Session, network: Network, payload: NetworkUpdate) -> Network:
    if payload.name is not None:
        network.name = payload.name
    if payload.network_type is not None:
        network.network_type = payload.network_type

    db.commit()
    db.refresh(network)
    return network


def delete_network(db: Session, network: Network) -> None:
    db.delete(network)
    db.commit()

