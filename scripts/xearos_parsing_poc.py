import json

data = []

with open("region.xaero", "rb") as stream:
    header = stream.read(8)

    assert header[0] == 0xFF, "missing file header"

    while True:
        chunk_data = []

        chunk_header = stream.read(16)
        while True:
            try:
                chunk = stream.read(8)
                if (len(chunk) == 0):
                    break
                if (chunk[7] == 0xFF):
                    break
                if (chunk[7] == 0x50):
                    break

                chunk_data.append(chunk.hex())

            except Exception as e:
                print(chunk, e)
        
        if len(chunk_data) == 0:
            break

        data.append({
            "header": chunk_data[0],
            "data": chunk_data[1:291],
            "footer": chunk_data[291:311]
        })
print("Done")

with open("out.json", "w") as f:
    f.write(json.dumps(data,  indent=4))