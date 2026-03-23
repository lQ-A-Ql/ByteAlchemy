def _normalize_format(value: str) -> str:
    normalized = (value or "utf-8").strip().lower().replace("_", "-")
    aliases = {
        "utf8": "utf-8",
        "text": "utf-8",
        "hex": "hex",
        "ascii": "ascii",
    }
    return aliases.get(normalized, normalized)


def _clean_hex(text: str, separator: str | None = None) -> str:
    clean_hex = (text or "").strip()
    if separator:
        clean_hex = clean_hex.replace(separator, "")

    if separator != " ":
        clean_hex = clean_hex.replace(" ", "")
    if separator != "\n":
        clean_hex = clean_hex.replace("\n", "")
    if separator != "\r":
        clean_hex = clean_hex.replace("\r", "")

    return clean_hex.replace("0x", "").replace("0X", "").replace("\\x", "").replace("\\X", "")


def convert_format(text: str, from_fmt: str, to_fmt: str, separator: str | None = None) -> str:
    source = _normalize_format(from_fmt)
    target = _normalize_format(to_fmt)

    if source == target:
        return text

    try:
        if source == "utf-8":
            data = text.encode("utf-8")
        elif source == "hex":
            data = bytes.fromhex(_clean_hex(text, separator))
        elif source == "ascii":
            data = text.encode("ascii")
        else:
            data = text.encode("utf-8")

        if target == "utf-8":
            return data.decode("utf-8", errors="replace")
        if target == "hex":
            return data.hex().upper()
        if target == "ascii":
            return data.decode("ascii", errors="replace")
        return data.decode("utf-8", errors="replace")
    except ValueError:
        return "[错误] 无效的 HEX 数据"
    except Exception as exc:
        return f"[转换错误] {exc}"


def swap_endian(text: str, fmt: str, separator: str | None = None) -> str:
    if not text:
        return ""

    normalized = _normalize_format(fmt)
    try:
        if normalized == "hex":
            return bytes.fromhex(_clean_hex(text, separator))[::-1].hex().upper()
        return text[::-1]
    except ValueError:
        return "[错误] 无效的 HEX 数据"
    except Exception as exc:
        return f"[转换错误] {exc}"
