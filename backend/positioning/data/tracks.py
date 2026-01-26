from os import getenv, path
from typing import Dict
from geojson import FeatureCollection, Feature, Point
from shapely import LineString
from turf import distance
from schema_gen.railline import RailLine

# Load default line
DEFAULT_LINE: RailLine
with open(path.join(getenv("LINES_PATH", "./raillines"), getenv("DEFAULT_LINE", "unknown") + ".json"), encoding="utf-8") as f:
    DEFAULT_LINE = RailLine.model_validate_json(f.read())

TRACK_LINESTRINGS: Dict[str, LineString] = {}
AUGMENTED_TRACK_DATA: Dict[str, FeatureCollection] = {}

# Process tracks
for track in DEFAULT_LINE.tracks:
    # Save linestring of track
    TRACK_LINESTRINGS[track.id] = LineString(track.data.coordinates)

    # Dissassemble into points and augment with track km
    features = []
    for idx, coord in enumerate(track.data.coordinates):
        point=Point(coordinates=[coord[0], coord[1]])
        km = 0
        if idx > 0:
            prev = features[idx - 1]
            km = prev["properties"]["trackKm"] + distance(prev["geometry"], point)
        features.append(Feature(
            geometry=point,
            properties={
                "trackKm": km,
            },
        ))
    AUGMENTED_TRACK_DATA[track.id] = FeatureCollection(features=features)
