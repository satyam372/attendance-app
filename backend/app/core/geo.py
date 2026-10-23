"""Distance between two points on Earth, used to check that an OFFICE check-in is at the office."""

import math

EARTH_RADIUS_M = 6_371_000  # mean radius; the error for distances of a few km is well under 1%


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in metres between two points given in degrees (haversine formula).

    Latitude and longitude are angles, not lengths: one degree of longitude is about 111 km at
    the equator but only about 105 km in Pune, so degrees cannot be converted with one constant.
    """
    # The trigonometry functions work in radians
    lat1_r, lng1_r, lat2_r, lng2_r = map(math.radians, (lat1, lng1, lat2, lng2))
    dlat = lat2_r - lat1_r
    dlng = lng2_r - lng1_r

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))  # angle between the two points, seen from Earth's centre
    return EARTH_RADIUS_M * c
