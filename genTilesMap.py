import os
import json

t = {}

with open("./src/tiles.json", "w") as f:
    for lod in os.listdir("./src/tiles"):
        t[lod] = os.listdir("./src/tiles/" + lod)
    f.write(json.dumps(t))