from __future__ import annotations

from contextlib import redirect_stdout
import io
import unittest

from campsite_watch.api import ApiHandler
from campsite_watch.api import _extract_official_park_image_url
from campsite_watch.api import _matches_query
from campsite_watch.api import _official_park_url
from campsite_watch.api import _ranges_overlap
from campsite_watch.api import _validate_refresh_query


class ApiBehaviorTest(unittest.TestCase):
    def test_write_auth_fails_closed_without_token(self) -> None:
        handler = object.__new__(ApiHandler)
        handler.api_token = ""
        handler.headers = {}
        handler.client_address = ("127.0.0.1", 12345)

        self.assertFalse(handler._authorized())

    def test_auth_rate_limit_after_failed_attempts(self) -> None:
        handler = object.__new__(ApiHandler)
        handler.headers = {}
        handler.client_address = ("127.0.0.1", 12345)
        handler.auth_failures = {}

        with redirect_stdout(io.StringIO()):
            for _ in range(6):
                handler._record_auth_failure()

        self.assertTrue(handler._auth_rate_limited())

        handler._record_auth_success()
        self.assertFalse(handler._auth_rate_limited())

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

    def test_exact_date_query_normalizes_one_sided_date(self) -> None:
        item = {
            "date": "2026-07-10",
            "end": "2026-07-12",
            "distanceMiles": 10,
        }

        self.assertTrue(_matches_query(item, {"startDate": ["2026-07-10"]}))
        self.assertFalse(_matches_query(item, {"startDate": ["2026-07-12"]}))

    def test_official_park_url_and_image_extraction(self) -> None:
        self.assertEqual(
            _official_park_url("Kitsap Memorial State Park"),
            "https://parks.wa.gov/find-parks/state-parks/kitsap-memorial-state-park",
        )
        html = '''
            <img src="/sites/default/files/WAStateParks_Logo.png">
            <img src="/sites/default/files/styles/square_600/public/2023-04/Kitsap%20Memorial%20beach.jpg?itok=fGGQVxSE">
        '''

        self.assertEqual(
            _extract_official_park_image_url(
                html,
                "https://parks.wa.gov/find-parks/state-parks/kitsap-memorial-state-park",
            ),
            "https://parks.wa.gov/sites/default/files/styles/square_600/public/2023-04/Kitsap%20Memorial%20beach.jpg?itok=fGGQVxSE",
        )


if __name__ == "__main__":
    unittest.main()
