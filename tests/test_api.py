from __future__ import annotations

import unittest

from campsite_watch.api import ApiHandler
from campsite_watch.api import _ranges_overlap
from campsite_watch.api import _validate_refresh_query


class ApiBehaviorTest(unittest.TestCase):
    def test_write_auth_fails_closed_without_token(self) -> None:
        handler = object.__new__(ApiHandler)
        handler.api_token = ""
        handler.headers = {}

        self.assertFalse(handler._authorized())

    def test_checked_months_survive_zero_result_refresh(self) -> None:
        handler = object.__new__(ApiHandler)
        payload = {
            "source": "live",
            "checkedMonths": ["2026-11"],
            "results": [],
        }

        result = handler._filtered_payload(payload, {"month": ["2026-11"]})

        self.assertEqual(result["checkedMonths"], ["2026-11"])
        self.assertEqual(result["coverageStatus"], "checked")

    def test_date_ranges_are_half_open(self) -> None:
        self.assertFalse(_ranges_overlap("2026-07-10", "2026-07-12", "2026-07-12", "2026-07-14"))
        self.assertTrue(_ranges_overlap("2026-07-10", "2026-07-12", "2026-07-11", "2026-07-13"))

    def test_refresh_validation_caps_scope(self) -> None:
        self.assertEqual(
            _validate_refresh_query(
                {
                    "people": ["4"],
                    "distanceMode": ["hours"],
                    "distance": ["300"],
                    "month": ["2026-11"],
                }
            ),
            "",
        )
        self.assertIn(
            "Group size",
            _validate_refresh_query(
                {
                    "people": ["16"],
                    "distanceMode": ["hours"],
                    "distance": ["300"],
                    "month": ["2026-11"],
                }
            ),
        )
        self.assertIn(
            "Refresh window",
            _validate_refresh_query(
                {
                    "people": ["4"],
                    "distanceMode": ["hours"],
                    "distance": ["300"],
                    "windowStart": ["2026-06-10"],
                    "windowEnd": ["2027-01-10"],
                }
            ),
        )


if __name__ == "__main__":
    unittest.main()
