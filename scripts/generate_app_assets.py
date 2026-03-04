from __future__ import annotations

from pathlib import Path

from PIL import Image


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    icons_dir = root / "icons"
    resources_dir = root / "resources"
    resources_dir.mkdir(exist_ok=True)

    # --- App icon ---
    # Use the largest available icon asset and upscale to 1024x1024 for native generators.
    icon_src = icons_dir / "icon-512.webp"
    icon = Image.open(icon_src).convert("RGBA")
    icon_out = icon.resize((1024, 1024), Image.LANCZOS)
    icon_out.save(resources_dir / "icon.png")

    # --- Splash ---
    # Create a square canvas with background color from capacitor.config.ts (#0f172a)
    bg = (15, 23, 42)  # RGB
    canvas_size = (2732, 2732)
    canvas = Image.new("RGB", canvas_size, bg)

    logo_src = icons_dir / "splash-logo.png"
    logo = Image.open(logo_src).convert("RGBA")

    # Scale logo to fit within a centered area
    max_w = int(canvas_size[0] * 0.6)
    max_h = int(canvas_size[1] * 0.25)
    ratio = min(max_w / logo.width, max_h / logo.height)
    new_size = (
        max(1, int(logo.width * ratio)),
        max(1, int(logo.height * ratio)),
    )
    logo_r = logo.resize(new_size, Image.LANCZOS)

    x = (canvas_size[0] - logo_r.width) // 2
    y = (canvas_size[1] - logo_r.height) // 2

    # Composite onto RGB canvas
    overlay = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    overlay.paste(logo_r, (x, y), logo_r)
    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.alpha_composite(overlay)
    canvas_rgba.convert("RGB").save(resources_dir / "splash.png")

    print("Generated:")
    print("-", resources_dir / "icon.png")
    print("-", resources_dir / "splash.png")


if __name__ == "__main__":
    main()
