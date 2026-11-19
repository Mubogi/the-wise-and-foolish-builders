"""Append classes.dex to a linked APK, preserving each entry's compression."""
import sys, zipfile, shutil

src, dex, out = sys.argv[1], sys.argv[2], sys.argv[3]
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(out, "w") as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        # Preserve stored vs deflated: Android requires resources.arsc uncompressed.
        zout.writestr(item, data, compress_type=item.compress_type)
    with open(dex, "rb") as f:
        zout.writestr("classes.dex", f.read(), compress_type=zipfile.ZIP_DEFLATED)
print("dex appended ->", out)
