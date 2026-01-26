from schema_gen.map_position import MapPosition
from processing.custom_types import AnalysisData, ParsedPosition, Projection
from shapely import Point
from data.tracks import AUGMENTED_TRACK_DATA, TRACK_LINESTRINGS
from turf import distance, nearest_point, point as TPoint
from typing import cast, Dict
from processing.notifier import notify_subscribers
from datetime import datetime


async def perform_projection(ppos: ParsedPosition, ana: AnalysisData):
    # FIXME Implement track detection

    track_id = next(iter(AUGMENTED_TRACK_DATA.keys()))
    track_features = next(iter(AUGMENTED_TRACK_DATA.values()))
    track_linestring = next(iter(TRACK_LINESTRINGS.values()))

    # GPS point
    coords = Point(ppos.position.longitude, ppos.position.latitude)

    ## Find nearest point on track
    # Produces RuntimeWarning: "invalid value encountered in line_locate_point" that can be ignored (https://github.com/shapely/shapely/issues/1796)
    nearest_point_on_line = track_linestring.project(coords)
    # TODO handle other tracks and side tracks!

    # Get distance in km
    nearest_point_pos = track_linestring.interpolate(nearest_point_on_line)  # convert to point
    nearest_point_pos = TPoint((nearest_point_pos.x, nearest_point_pos.y))  # convert point for turf
    nearest_point_pos_feature = cast(Dict, nearest_point_pos)
    nearest_feature = cast(Dict, nearest_point(nearest_point_pos, track_features))  # type: ignore
    nearest_point_km = nearest_feature["properties"]["trackKm"] + distance(nearest_point_pos, nearest_feature["geometry"])
    off_track = distance(nearest_point_pos, TPoint((coords.x, coords.y))) > 0.1  # FIXME Improve

    # Create data entries
    ana.projection_source = Projection(
        created=datetime.now(),
        positions=[ppos],
    )
    ana.map_pos = MapPosition(
        timestamp=ppos.timestamp.isoformat(),
        vehicle=ppos.vehicle.uid if ppos.vehicle is not None else -abs(hash(ppos.position.deviceID)),
        track=track_id,
        position=nearest_point_on_line,
        heading=ppos.position.heading, # FIXME normalize for track and speed
        speed=ppos.position.speed,
        longitude=nearest_point_pos_feature["geometry"]["coordinates"][0] if not off_track else ppos.position.longitude,
        latitude=nearest_point_pos_feature["geometry"]["coordinates"][1] if not off_track else ppos.position.latitude,
        label=str(ppos.vehicle.info["label"]) if ppos.vehicle and "label" in ppos.vehicle.info and ppos.vehicle.info["label"] is not None else "??",
        offtrack=off_track,
    )

    # Notify subscribers
    await notify_subscribers(ana)
