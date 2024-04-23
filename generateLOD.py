import os
import json
import math
from PIL import Image

images = {}

mi_x, mi_y, ma_x, ma_y = -11264, -10752, 9216, 9728
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

    for tx in range(0, lw):
        for ty in range(0, lh):
            print(tx, ty)
            # LOD_TILE
            img = Image.new("RGBA", (lod_tile_size, lod_tile_size))

            for sx in range(0, m):
                for sy in range(0, m):
                    key = f"{mi_x + tx * lod_tile_size + sx * 1024}_{mi_y + ty * lod_tile_size + sy * 1024}"

                    if not key in images:
                        continue

                    tile = images[key]
                    img.paste(tile, (sx * 1024, sy * 1024))

            resized = img.resize((1024, 1024), Image.Resampling.NEAREST)

            resized.save(f"./src/tiles/lod-{lod}/{mi_x + tx * lod_tile_size}_{mi_y + ty * lod_tile_size}.png")
