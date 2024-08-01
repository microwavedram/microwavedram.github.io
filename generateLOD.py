import os
import json
import math
from PIL import Image

images = {}

mi_x, mi_y, ma_x, ma_y = -24576, -24576, 24576, 24576
dx, dy = ma_x - mi_x, ma_y - mi_y

rx, ry = dx / 1024, dy / 1024

for filename in os.listdir("./src/tiles/lod-0"):
    images[filename[:-4]] = Image.open(f"./src/tiles/lod-0/{filename}")

for lod in range(1, 4):
    if not os.path.exists(f"./src/tiles/lod-{lod}"):
        os.mkdir(f"./src/tiles/lod-{lod}")

    print(f"Generating LOD {lod}")
    m = 2 ** lod
    lod_tile_size = 1024 * m

    lw = math.ceil(dx / lod_tile_size)
    lh = math.ceil(dy / lod_tile_size)

    for tx in range(-1, lw + 1):
        for ty in range(-1, lh + 1):
            print(tx, ty)
            # LOD_TILE
            img = Image.new("RGBA", (lod_tile_size, lod_tile_size))

            for sx in range(0, m):
                for sy in range(0, m):
                    key = f"{mi_x + tx * lod_tile_size + sx * 1024}_{mi_y + ty * lod_tile_size + sy * 1024}"

                    if not key in images:
                        print(f"not found {key}")
                        continue

                    tile = images[key]
                    img.paste(tile, (sx * 1024, sy * 1024))

            resized = img.resize((1024, 1024), Image.Resampling.NEAREST)

            resized.save(f"./src/tiles/lod-{lod}/{mi_x + tx * lod_tile_size}_{mi_y + ty * lod_tile_size}.png")
