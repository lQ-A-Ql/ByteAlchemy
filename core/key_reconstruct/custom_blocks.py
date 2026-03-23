
import json
from pathlib import Path
from typing import Any, Dict


CUSTOM_BLOCKS_FILE = Path(__file__).resolve().parents[2] / "data" / "custom_blocks.json"

def get_custom_blocks() -> Dict[str, Dict[str, Any]]:
    """Load custom blocks from JSON file."""
    if not CUSTOM_BLOCKS_FILE.exists():
        return {}

    try:
        with CUSTOM_BLOCKS_FILE.open("r", encoding="utf-8") as file:
            return json.load(file)
    except Exception as exc:
        print(f"Error loading custom blocks: {exc}")
        return {}


def _save_blocks(blocks: Dict[str, Dict[str, Any]]) -> bool:
    try:
        CUSTOM_BLOCKS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with CUSTOM_BLOCKS_FILE.open("w", encoding="utf-8") as file:
            json.dump(blocks, file, indent=4, ensure_ascii=False)
        return True
    except Exception as exc:
        print(f"Error saving custom blocks: {exc}")
        return False


def save_custom_block(block_id: str, block_def: Dict[str, Any]) -> bool:
    """Save or update a custom block."""
    blocks = get_custom_blocks()
    blocks[block_id] = block_def
    return _save_blocks(blocks)

def delete_custom_block(block_id: str) -> bool:
    """Delete a custom block."""
    blocks = get_custom_blocks()
    if block_id in blocks:
        del blocks[block_id]
        return _save_blocks(blocks)
    return False
