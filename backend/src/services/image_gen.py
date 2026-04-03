"""
Virtual try-on using IDM-VTON hosted on Hugging Face Spaces (free).
"""

import io
import os
import asyncio
import base64
import tempfile
import httpx
from PIL import Image
from gradio_client import Client, handle_file

TRYON_AVAILABLE = True

_client = None

NB_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Referer": "https://www.newbalance.com/",
}


def get_client():
    global _client
    if _client is None:
        _client = Client("yisol/IDM-VTON")
    return _client


def _download_garment_sync(url: str, save_path: str):
    """Download garment image with proper headers."""
    if not url or not url.startswith("http"):
        Image.new("RGB", (440, 440), (60, 60, 60)).save(save_path)
        return
    if "nb.scene7.com" in url and "wid=" not in url and "$" not in url:
        url += "?&wid=440&hei=440"
    try:
        with httpx.Client(follow_redirects=True) as http:
            resp = http.get(url, headers=NB_HEADERS, timeout=15)
            if resp.status_code != 200 or len(resp.content) < 100:
                Image.new("RGB", (440, 440), (60, 60, 60)).save(save_path)
                return
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            img.save(save_path)
    except Exception:
        Image.new("RGB", (440, 440), (60, 60, 60)).save(save_path)


def _run_tryon(person_path: str, garment_path: str, description: str) -> str:
    """Run the try-on prediction (blocking call)."""
    client = get_client()

    result = client.predict(
        dict={"background": handle_file(person_path), "layers": [], "composite": None},
        garm_img=handle_file(garment_path),
        garment_des=description,
        is_checked=True,
        is_checked_crop=False,
        denoise_steps=20,
        seed=42,
        api_name="/tryon",
    )

    output_path = result[0] if isinstance(result, (list, tuple)) else result

    with open(output_path, "rb") as f:
        img_bytes = f.read()

    b64 = base64.b64encode(img_bytes).decode()
    return f"data:image/png;base64,{b64}"


async def generate_tryon(person_image_bytes: bytes, garment_image_url: str, garment_description: str) -> str:
    """Generate a virtual try-on image using IDM-VTON on Hugging Face Spaces."""
    person_path = os.path.join(tempfile.gettempdir(), "tryon_person.png")
    garment_path = os.path.join(tempfile.gettempdir(), "tryon_garment.png")

    # Save person image
    person_img = Image.open(io.BytesIO(person_image_bytes)).convert("RGB")
    person_img = person_img.resize((768, 1024))
    person_img.save(person_path)

    # Download garment image (sync, in thread to not block)
    await asyncio.to_thread(_download_garment_sync, garment_image_url, garment_path)

    try:
        # Run prediction in thread (it's a blocking call)
        result = await asyncio.to_thread(_run_tryon, person_path, garment_path, garment_description)
        return result
    finally:
        for p in [person_path, garment_path]:
            try:
                os.unlink(p)
            except OSError:
                pass
