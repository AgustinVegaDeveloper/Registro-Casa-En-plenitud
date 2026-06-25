import enum


class NetworkType(str, enum.Enum):
    GROWTH = "growth"
    CONSOLIDATION = "consolidation"
    TRANSITION = "transition"


class MemberSex(str, enum.Enum):
    UNSPECIFIED = "unspecified"


class MeetingType(str, enum.Enum):
    CELL_MEETING = "cell_meeting"
    WEEKEND_SERVICE = "weekend_service"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "P"
    LATE = "R"
    ABSENT = "N"
    EXCUSED = "E"


class ExcuseReason(str, enum.Enum):
    ILLNESS = "illness"
    TRAVEL = "travel"
    WORK = "work"
    STUDY = "study"
    OTHER = "other"
