"""Builds the iMessage extension's asset catalog (plugins/with-messages-extension/Assets.xcassets) from the
Kismet brand kit (E:/kismet-brand, see its README.md) and the marks in assets/images.

  python tools/make_imessage_assets.py [--brand E:/kismet-brand]

- "iMessage App Icon.stickersiconset": the kit's imessage/MessagesIcon-*.png and MessagesAppIcon-1024x768.png,
  in every slot Xcode's iMessage templates list (the iPad 29x29@2x Settings slot reuses the iPhone file).
- KismetMark.imageset: assets/images/kismet-mark-light.png, with kismet-mark.png for dark appearance.
- InviteCard.imageset: the invite bubble's image, the kit's OG layout (logo + "Agents meet first. You meet the right people."),
  rendered by tools/make_invite_card.js (needs Node and sharp, from E:/agent-dates/node_modules).
"""
import argparse
import json
import os
import subprocess
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "plugins" / "with-messages-extension" / "Assets.xcassets"
INFO = {"author": "xcode", "version": 1}

SLOTS = [  # (idiom, size in points, scale, platform)
    ("iphone", "29x29", 2, None), ("iphone", "29x29", 3, None),
    ("iphone", "60x45", 2, None), ("iphone", "60x45", 3, None),
    ("ipad", "29x29", 2, None), ("ipad", "67x50", 2, None), ("ipad", "74x55", 2, None),
    ("universal", "27x20", 2, "ios"), ("universal", "27x20", 3, "ios"),
    ("universal", "32x24", 2, "ios"), ("universal", "32x24", 3, "ios"),
    ("ios-marketing", "1024x768", 1, "ios"),
]


def write_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", default="E:/kismet-brand")
    brand = Path(ap.parse_args().brand)

    shutil.rmtree(OUT, ignore_errors=True)
    iconset = OUT / "iMessage App Icon.stickersiconset"
    iconset.mkdir(parents=True)
    write_json(OUT / "Contents.json", {"info": INFO})

    images = []
    for idiom, size, scale, platform in SLOTS:
        name = "MessagesAppIcon-1024x768.png" if size == "1024x768" else f"MessagesIcon-{size}@{scale}x.png"
        src = brand / "imessage" / name
        w, h = (int(v) * scale for v in size.split("x"))
        img = Image.open(src)
        if img.size != (w, h) or img.mode != "RGB":
            raise SystemExit(f"{src}: {img.size} {img.mode}, expected {(w, h)} RGB")
        shutil.copyfile(src, iconset / name)
        entry = {"filename": name, "idiom": idiom, "scale": f"{scale}x", "size": size}
        if platform:
            entry["platform"] = platform
        images.append(entry)
    write_json(iconset / "Contents.json", {"images": images, "info": INFO})

    mark = OUT / "KismetMark.imageset"
    mark.mkdir()
    shutil.copyfile(ROOT / "assets/images/kismet-mark-light.png", mark / "KismetMark-light.png")
    shutil.copyfile(ROOT / "assets/images/kismet-mark.png", mark / "KismetMark-dark.png")
    write_json(mark / "Contents.json", {
        "images": [
            {"filename": "KismetMark-light.png", "idiom": "universal"},
            {"appearances": [{"appearance": "luminosity", "value": "dark"}], "filename": "KismetMark-dark.png", "idiom": "universal"},
        ],
        "info": INFO,
    })

    card = OUT / "InviteCard.imageset"
    card.mkdir()
    subprocess.run(["node", str(Path(__file__).with_name("make_invite_card.js")), str(card / "InviteCard.png")], check=True,
                   env={**os.environ, "NODE_PATH": "E:/agent-dates/node_modules"})
    write_json(card / "Contents.json", {"images": [{"filename": "InviteCard.png", "idiom": "universal"}], "info": INFO})
    print("wrote", OUT)


if __name__ == "__main__":
    main()
