import os
import json

with open("./src/tiles.json", "w") as f:
    f.write(json.dumps(os.listdir("./src/tiles")))