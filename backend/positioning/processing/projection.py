from processing.custom_positions import ParsedPosition, ProjectedPosition
from shapely import Point
from data.tracks import AUGMENTED_TRACK_DATA, AUGMENTED_TRACK_LINESTRINGS
from turf import distance, nearest_point, point as TPoint
from typing import cast, Dict
from data.trackers import tracker_info
from processing.notifier import notify_subscribers
from datetime import datetime 

current = {}

async def perform_projection(ppos: ParsedPosition):
    # FIXME Implement track detection

    track_id = next(iter(AUGMENTED_TRACK_DATA.keys()))
    track_features = next(iter(AUGMENTED_TRACK_DATA.values()))
    track_linestring = next(iter(AUGMENTED_TRACK_LINESTRINGS.values()))

    # GPS point
    coords = Point(ppos.position.longitude, ppos.position.latitude)

    ## Find nearest point on track
    # Produces RuntimeWarning: "invalid value encountered in line_locate_point" that can be ignored (https://github.com/shapely/shapely/issues/1796)
    nearest_point_on_line = track_linestring.project(coords)
    # TODO handle other tracks and side tracks!
    
    # Get distance in km 
    nearest_point_pos = track_linestring.interpolate(nearest_point_on_line) # convert to point
    nearest_point_pos = TPoint((nearest_point_pos.x, nearest_point_pos.y)) # convert point for turf
    nearest_feature = cast(Dict, nearest_point(nearest_point_pos, track_features)) # type: ignore
    nearest_point_km = nearest_feature["properties"]["trackKm"] + distance(nearest_point_pos, nearest_feature["geometry"])

    # Create data entry 
    proj_pos = ProjectedPosition(
        timestamp=ppos.timestamp,
        created=datetime.now(),
        raw_position=ppos.position,
        vehicle=ppos.vehicle,
        track = track_id,
        track_position = nearest_point_on_line,
        longitude = nearest_point_pos['geometry']['coordinates'][0], # type: ignore
        latitude = nearest_point_pos['geometry']['coordinates'][1], # type: ignore
        heading = ppos.position.heading, # FIXME normalize to track direction in projection
    )


    # Notify subscribers
    await notify_subscribers(proj_pos)

    # TODO Store in DB

    # Save for testing FIXME remove
    current[tracker_info(ppos.tracker).deviceID] = {"coords": (ppos.position.longitude, ppos.position.latitude), "pos": nearest_point_on_line, "km": nearest_point_km}
