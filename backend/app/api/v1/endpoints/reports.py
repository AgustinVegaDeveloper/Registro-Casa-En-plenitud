from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from openpyxl import Workbook
from openpyxl.styles import Font
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet

from app.api.deps import get_db_session, require_advisor
from app.schemas.report import ReportSummaryRead
from app.services.report_service import get_attendance_report_export_data, get_attendance_summary

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/attendance/summary", response_model=ReportSummaryRead, dependencies=[Depends(require_advisor)])
def attendance_summary(
    period: str = Query(default="month"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db_session),
):
    return get_attendance_summary(db, period, start_date, end_date)


@router.get("/attendance/export", dependencies=[Depends(require_advisor)])
def export_attendance_report(
    scope: str = Query(default="member"),
    period: str = Query(default="month"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    format: str = Query(default="xlsx", pattern="^(xlsx|pdf)$"),
    db: Session = Depends(get_db_session),
):
    if scope not in {"member", "cell", "network"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid scope")

    summary, rows = get_attendance_report_export_data(db, scope, period, start_date, end_date)
    scope_label = {"member": "Integrantes", "cell": "Células", "network": "Redes"}[scope]
    period_label = period.replace("today", "Hoy").replace("week", "Semana").replace("month", "Mes").replace("quarter", "Trimestre").replace("semester", "Semestre").replace("year", "Año").replace("custom", "Personalizado")
    file_name = f"reporte_asistencia_{scope}_{period}.{'pdf' if format == 'pdf' else 'xlsx'}"

    if format == "xlsx":
        workbook = Workbook()
        summary_sheet = workbook.active
        summary_sheet.title = "Resumen"
        summary_sheet.append(["Concepto", "Valor"])
        summary_sheet["A1"].font = Font(bold=True)
        summary_sheet["B1"].font = Font(bold=True)
        for key, value in (
            ("Alcance", scope_label),
            ("Período", period_label),
            ("Inicio", summary["period_start"].isoformat()),
            ("Fin", summary["period_end"].isoformat()),
            ("Reuniones", summary["total_meetings"]),
            ("Registros", summary["total_records"]),
            ("Presentes", summary["presents"]),
            ("Retardos", summary["lates"]),
            ("Excusados", summary["excused"]),
            ("Ausentes", summary["absents"]),
            ("Asistencia %", summary["attendance_rate"]),
        ):
            summary_sheet.append([key, value])

        data_sheet = workbook.create_sheet("Detalle")
        data_sheet.append(["ID", "Nombre", "Reuniones", "Registros", "Presentes", "Retardos", "Excusados", "Ausentes", "Asistencia %"])
        for cell in data_sheet[1]:
            cell.font = Font(bold=True)
        for row in rows:
            data_sheet.append([
                row["entity_id"],
                row["entity_name"],
                row["total_meetings"],
                row["total_records"],
                row["presents"],
                row["lates"],
                row["excused"],
                row["absents"],
                row["attendance_rate"],
            ])

        stream = BytesIO()
        workbook.save(stream)
        stream.seek(0)
        return StreamingResponse(
            stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
        )

    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=landscape(A4), title="Reporte de asistencia")
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Reporte de asistencia", styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"Alcance: {scope_label}", styles["BodyText"]),
        Paragraph(f"Período: {period_label} | {summary['period_start'].isoformat()} a {summary['period_end'].isoformat()}", styles["BodyText"]),
        Spacer(1, 12),
    ]
    summary_table = Table(
        [["Reuniones", summary["total_meetings"]], ["Registros", summary["total_records"]], ["Presentes", summary["presents"]], ["Retardos", summary["lates"]], ["Excusados", summary["excused"]], ["Ausentes", summary["absents"]], ["Asistencia %", summary["attendance_rate"]]],
        colWidths=[140, 120],
    )
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ]))
    story.extend([summary_table, Spacer(1, 18)])

    table_data = [["Nombre", "Reuniones", "Registros", "Presentes", "Retardos", "Excusados", "Ausentes", "Asistencia %"]]
    table_data.extend(
        [[row["entity_name"], row["total_meetings"], row["total_records"], row["presents"], row["lates"], row["excused"], row["absents"], row["attendance_rate"]] for row in rows]
    )
    detail_table = Table(table_data, repeatRows=1)
    detail_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f2d24")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    story.append(detail_table)
    document.build(story)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )

