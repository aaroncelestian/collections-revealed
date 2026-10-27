#!/usr/bin/env python3
"""Move an MP4's moov atom to the front so playback can start before the
whole file is downloaded. Patches stco/co64 chunk offsets in place.

Usage: python3 scripts/faststart-mp4.py <file.mp4> [<file.mp4> ...]
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path


def iter_boxes(data: bytes, start: int = 0, end: int | None = None):
    if end is None:
        end = len(data)
    i = start
    while i + 8 <= end:
        size = struct.unpack('>I', data[i : i + 4])[0]
        typ = data[i + 4 : i + 8]
        hdr = 8
        if size == 1:
            if i + 16 > end:
                break
            size = struct.unpack('>Q', data[i + 8 : i + 16])[0]
            hdr = 16
        elif size == 0:
            size = end - i
        if size < 8 or i + size > end:
            break
        yield i, hdr, size, bytes(typ)
        i += size


def patch_chunk_offsets(moov: bytearray, delta: int) -> None:
    """Add delta to every stco/co64 offset inside a moov box."""

    def walk(start: int, end: int) -> None:
        for i, hdr, size, typ in iter_boxes(moov, start, end):
            body = i + hdr
            if typ == b'stco' and size >= hdr + 8:
                count = struct.unpack('>I', moov[body + 4 : body + 8])[0]
                p = body + 8
                for _ in range(count):
                    if p + 4 > end:
                        return
                    val = struct.unpack('>I', moov[p : p + 4])[0]
                    moov[p : p + 4] = struct.pack('>I', (val + delta) & 0xFFFFFFFF)
                    p += 4
            elif typ == b'co64' and size >= hdr + 8:
                count = struct.unpack('>I', moov[body + 4 : body + 8])[0]
                p = body + 8
                for _ in range(count):
                    if p + 8 > end:
                        return
                    val = struct.unpack('>Q', moov[p : p + 8])[0]
                    moov[p : p + 8] = struct.pack('>Q', val + delta)
                    p += 8
            elif typ in {b'trak', b'mdia', b'minf', b'stbl', b'edts', b'mdhd'}:
                walk(body, i + size)

    walk(8 if moov[4:8] == b'moov' else 0, len(moov))


def faststart(path: Path) -> bool:
    data = bytearray(path.read_bytes())
    top = list(iter_boxes(data))
    boxes = {typ: (i, hdr, size) for i, hdr, size, typ in top}
    if b'moov' not in boxes or b'mdat' not in boxes:
        print(f'  skip {path.name}: missing moov/mdat')
        return False
    moov_i, _, moov_size = boxes[b'moov']
    mdat_i, _, _ = boxes[b'mdat']
    if moov_i < mdat_i:
        print(f'  ok   {path.name}: already faststart')
        return False

    ftyp = next(((i, size) for i, _, size, typ in top if typ == b'ftyp'), None)
    if not ftyp:
        print(f'  skip {path.name}: no ftyp')
        return False
    ftyp_i, ftyp_size = ftyp
    ftyp_bytes = bytes(data[ftyp_i : ftyp_i + ftyp_size])
    moov = bytearray(data[moov_i : moov_i + moov_size])
    mdat = bytes(data[mdat_i : mdat_i + boxes[b'mdat'][2]])

    new_mdat = ftyp_size + moov_size
    delta = new_mdat - mdat_i
    patch_chunk_offsets(moov, delta)
    path.write_bytes(ftyp_bytes + bytes(moov) + mdat)
    print(f'  moved moov to front in {path.name} (delta {delta:+d})')
    return True


def main() -> int:
    if len(sys.argv) < 2:
        print('usage: faststart-mp4.py <file.mp4> ...', file=sys.stderr)
        return 2
    for arg in sys.argv[1:]:
        faststart(Path(arg))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
