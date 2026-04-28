from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parent.parent / 'public' / 'icons'
ROOT.mkdir(parents=True, exist_ok=True)

BG = (0x25, 0x63, 0xEB, 255)
FG = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)
LEFT_POINTS = ((102, 62), (58, 128), (102, 194))
RIGHT_POINTS = ((154, 62), (198, 128), (154, 194))


def inside_round_rect(x: float, y: float, size: int, radius: float) -> bool:
    if radius <= 0:
        return 0 <= x < size and 0 <= y < size

    left = radius
    right = size - radius
    top = radius
    bottom = size - radius

    if left <= x < right or top <= y < bottom:
        return True

    corners = (
        (left, top),
        (right - 1, top),
        (left, bottom - 1),
        (right - 1, bottom - 1),
    )

    for cx, cy in corners:
        if (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
            return True

    return False


def set_pixel(buffer: bytearray, size: int, x: int, y: int, color: tuple[int, int, int, int]) -> None:
    if 0 <= x < size and 0 <= y < size:
        index = (y * size + x) * 4
        buffer[index:index + 4] = bytes(color)


def draw_disc(buffer: bytearray, size: int, cx: float, cy: float, radius: float, color: tuple[int, int, int, int]) -> None:
    radius = max(0.75, radius)
    x0 = max(0, int(math.floor(cx - radius)))
    x1 = min(size - 1, int(math.ceil(cx + radius)))
    y0 = max(0, int(math.floor(cy - radius)))
    y1 = min(size - 1, int(math.ceil(cy + radius)))
    radius_squared = radius * radius

    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            dx = (x + 0.5) - cx
            dy = (y + 0.5) - cy
            if dx * dx + dy * dy <= radius_squared:
                set_pixel(buffer, size, x, y, color)


def draw_segment(
    buffer: bytearray,
    size: int,
    p1: tuple[float, float],
    p2: tuple[float, float],
    stroke: float,
    color: tuple[int, int, int, int],
) -> None:
    x1, y1 = p1
    x2, y2 = p2
    steps = max(1, int(max(abs(x2 - x1), abs(y2 - y1)) * 3))

    for step in range(steps + 1):
        t = step / steps
        x = x1 + (x2 - x1) * t
        y = y1 + (y2 - y1) * t
        draw_disc(buffer, size, x, y, stroke / 2, color)


def make_icon(size: int) -> bytearray:
    buffer = bytearray(size * size * 4)
    radius = size * 56 / 256

    for y in range(size):
        for x in range(size):
            color = BG if inside_round_rect(x + 0.5, y + 0.5, size, radius) else TRANSPARENT
            set_pixel(buffer, size, x, y, color)

    scale = size / 256
    stroke = size * 22 / 256
    left_points = [(x * scale, y * scale) for x, y in LEFT_POINTS]
    right_points = [(x * scale, y * scale) for x, y in RIGHT_POINTS]

    draw_segment(buffer, size, left_points[0], left_points[1], stroke, FG)
    draw_segment(buffer, size, left_points[1], left_points[2], stroke, FG)
    draw_segment(buffer, size, right_points[0], right_points[1], stroke, FG)
    draw_segment(buffer, size, right_points[1], right_points[2], stroke, FG)
    return buffer


def png_chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack('!I', len(data)) + tag + data + struct.pack('!I', zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int, buffer: bytearray) -> None:
    rows = []
    stride = size * 4

    for y in range(size):
        start = y * stride
        rows.append(b'\x00' + buffer[start:start + stride])

    raw = b''.join(rows)
    ihdr = struct.pack('!IIBBBBB', size, size, 8, 6, 0, 0, 0)
    data = b'\x89PNG\r\n\x1a\n'
    data += png_chunk(b'IHDR', ihdr)
    data += png_chunk(b'IDAT', zlib.compress(raw, 9))
    data += png_chunk(b'IEND', b'')
    path.write_bytes(data)


def main() -> None:
    for size in (16, 32, 48, 128):
        write_png(ROOT / f'icon-{size}.png', size, make_icon(size))


if __name__ == '__main__':
    main()
