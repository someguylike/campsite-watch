from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
import calendar

from .config import DateWindow


@dataclass(frozen=True)
class Stay:
    arrival: date
    departure: date


def add_months(start: date, months: int) -> date:
    month_index = start.month - 1 + months
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def weekend_stays(today: date, window: DateWindow) -> list[Stay]:
    start = add_months(today, window.earliest_months_ahead)
    end = add_months(today, window.latest_months_ahead)

    current = start
    while current.weekday() not in window.arrival_weekdays:
        current += timedelta(days=1)

    stays: list[Stay] = []
    while current <= end:
        stays.append(Stay(arrival=current, departure=current + timedelta(days=window.stay_nights)))
        current += timedelta(days=1)
        while current.weekday() not in window.arrival_weekdays:
            current += timedelta(days=1)

    return stays

