
import json
import os
from typing import Dict, Any

CUSTOM_BLOCKS_FILE = "custom_blocks.json"

def get_custom_blocks() -> Dict[str, Dict[str, Any]]:
    """Load custom blocks from JSON file."""
    if not os.path.exists(CUSTOM_BLOCKS_FILE):
        return {}
    
    try:
        with open(CUSTOM_BLOCKS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading custom blocks: {e}")
        return {}

def save_custom_block(block_id: str, block_def: Dict[str, Any]) -> bool:
    """Save or update a custom block."""
    blocks = get_custom_blocks()
    blocks[block_id] = block_def
    try:
        with open(CUSTOM_BLOCKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(blocks, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving custom block: {e}")
        return False

def delete_custom_block(block_id: str) -> bool:
    """Delete a custom block."""
    blocks = get_custom_blocks()
    if block_id in blocks:
        del blocks[block_id]
        try:
            with open(CUSTOM_BLOCKS_FILE, 'w', encoding='utf-8') as f:
                json.dump(blocks, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving after delete: {e}")
            return False
    return False
