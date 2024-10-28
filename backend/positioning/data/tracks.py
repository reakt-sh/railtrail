from os import getenv, path
from typing import Dict
from geojson import utils as gutils
from geojson import loads as gloads
from shapely import LineString
from turf import distance
from schema_gen.railline import RailLine
from copy import deepcopy

# Load default line
DEFAULT_LINE: RailLine
with open(path.join(getenv("LINES_PATH", "./raillines"), getenv("DEFAULT_LINE", "unknown") + ".json")) as f:
    DEFAULT_LINE = RailLine.model_validate_json(f.read())


# Augment with track km
AUGMENTED_TRACK_DATA: Dict[str, Dict] = {}
AUGMENTED_TRACK_LINESTRINGS: Dict[str, LineString] = {}
for i in range(len(DEFAULT_LINE.tracks)):
    track = DEFAULT_LINE.tracks[i]
    data = deepcopy(track.data)

    for idx, feature in enumerate(data["features"]):
        if idx == 0:
            km = 0
        else:
            prev = data["features"][idx - 1]
            km = prev["properties"]["trackKm"] + distance(prev["geometry"], feature["geometry"])
        feature["properties"]["trackKm"] = km

    AUGMENTED_TRACK_DATA[track.id] = data
    AUGMENTED_TRACK_LINESTRINGS[track.id] = LineString(gutils.coords(data))
