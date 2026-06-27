from fastapi import APIRouter

from app.api.v1.endpoints import auth, attendance, cell_summary, cells, dashboard, health, members, memberships, networks, report_scope, reports, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(networks.router)
api_router.include_router(cells.router)
api_router.include_router(cell_summary.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)
api_router.include_router(report_scope.router)
api_router.include_router(members.router)
api_router.include_router(memberships.router)
api_router.include_router(attendance.router)
api_router.include_router(users.router)
