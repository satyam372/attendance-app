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


# API-only enums (not stored): used by the attendance history table


class DayStatus(StrEnum):
    OFFICE = "OFFICE"
    WFH = "WFH"
    HYBRID = "HYBRID"
    HALF_DAY_LEAVE = "HALF_DAY_LEAVE"
    LEAVE = "LEAVE"
    HOLIDAY = "HOLIDAY"
    ABSENT = "ABSENT"  # past working day with no attendance row
    NOT_CHECKED_IN = "NOT_CHECKED_IN"  # today, not checked in yet


class Punctuality(StrEnum):
    ON_TIME = "ON_TIME"  # at or before OFFICE_START (10:30)
    WITHIN_GRACE = "WITHIN_GRACE"  # after 10:30, up to and including 11:00
    LATE = "LATE"  # after 11:00
    NO_CHECK_IN = "NO_CHECK_IN"  # working day without a check-in
