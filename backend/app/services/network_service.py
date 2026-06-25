from sqlalchemy.orm import Session

from app.models.network import NetworkAdvisor


def count_network_advisors(db: Session, network_id: int) -> int:
    return db.query(NetworkAdvisor).filter(NetworkAdvisor.network_id == network_id).count()
