from enum import StrEnum


class Role(StrEnum):
    EMPLOYEE = "EMPLOYEE"
    MANAGER = "MANAGER"
    HR = "HR"


class WorkMode(StrEnum):
    OFFICE = "OFFICE"
    WFH = "WFH"
    HYBRID = "HYBRID"  # half WFH + half office


class LeavePortion(StrEnum):
    NONE = "NONE"
    HALF = "HALF"
    FULL = "FULL"


class LeaveHalf(StrEnum):
    # Leave only; WFH never needs a half
    FIRST_HALF = "FIRST_HALF"
    SECOND_HALF = "SECOND_HALF"


class RequestType(StrEnum):
    FULL_LEAVE = "FULL_LEAVE"
    HALF_DAY_LEAVE = "HALF_DAY_LEAVE"
    HALF_LEAVE_HALF_WFH = "HALF_LEAVE_HALF_WFH"
    HALF_WFH = "HALF_WFH"
    FULL_WFH = "FULL_WFH"


class LeaveCategory(StrEnum):
    CASUAL = "CASUAL"
    SICK = "SICK"
    EARNED = "EARNED"
    OPTIONAL_HOLIDAY = "OPTIONAL_HOLIDAY"


class ApprovalStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
