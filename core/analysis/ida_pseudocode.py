"""
IDA pseudocode crypto recognizer (rule-based).
"""

import re
from typing import Dict, List, Any


def _find_all(patterns: List[str], text: str) -> List[str]:
    hits = []
    for pat in patterns:
        if re.search(pat, text, re.IGNORECASE | re.MULTILINE):
            hits.append(pat)
    return hits


def analyze_ida_pseudocode(code: str) -> Dict[str, Any]:
    text = code or ""
    if not text.strip():
        return {
            "summary": "Empty input",
            "matches": [],
            "notes": ["Provide IDA pseudocode text for analysis."],
        }

    rules = [
        {
            "name": "AES",
            "markers": [
                r"SubBytes|ShiftRows|MixColumns|AddRoundKey",
                r"RCON|0x1B\b|0x11B\b",
                r"0x63\s*,\s*0x7c\s*,\s*0x77\s*,\s*0x7b",
                r"SBOX|sbox\[",
            ],
            "hints": ["Look for 10/12/14 rounds and 16-byte state operations."],
        },
        {
            "name": "SM4",
            "markers": [
                r"0xa3b1bac6|0x56aa3350|0x677d9197|0xb27022dc",
                r"0x00070e15|0x1c232a31|0x383f464d|0x545b6269",
                r"SM4|SMS4",
                r"SBOX|sbox\[",
            ],
            "hints": ["Check for 32 rounds and linear transform L() with rotl 2/10/18/24."],
        },
        {
            "name": "DES/3DES",
            "markers": [
                r"\bIP\b|initial permutation",
                r"\bPC1\b|\bPC2\b",
                r"\bS1\b|\bS2\b|\bS3\b|\bS4\b",
                r"58,\s*50,\s*42,\s*34,\s*26,\s*18,\s*10,\s*2",
            ],
            "hints": ["Check for 16 rounds and Feistel structure."],
        },
        {
            "name": "RC4",
            "markers": [
                r"for\s*\(.*<\s*256|range\(256\)",
                r"S\[256\]|S\s*=\s*\{0,\s*1,\s*2",
                r"j\s*=\s*\(j\s*\+\s*S\[i\]",
                r"PRGA|KSA",
            ],
            "hints": ["Look for S array permutation and i/j swap."],
        },
        {
            "name": "ChaCha20",
            "markers": [
                r"0x61707865|0x3320646e|0x79622d32|0x6b206574",
                r"quarter\s*round",
                r"rotl\s*\(.*16\)|rotl\s*\(.*12\)|rotl\s*\(.*8\)|rotl\s*\(.*7\)",
                r"ChaCha",
            ],
            "hints": ["Look for 20 rounds and 4x4 state of 16 words."],
        },
        {
            "name": "Salsa20",
            "markers": [
                r"expand 32-byte k|0x61707865",
                r"rotl\s*\(.*7\)|rotl\s*\(.*9\)|rotl\s*\(.*13\)|rotl\s*\(.*18\)",
                r"Salsa",
            ],
            "hints": ["Check for 20 rounds with column/row rounds."],
        },
        {
            "name": "MD5",
            "markers": [
                r"0xd76aa478|0xe8c7b756|0x242070db",
                r"\bF\(|\bG\(|\bH\(|\bI\(",
                r"7,\s*12,\s*17,\s*22",
                r"K\[64\]|T\[64\]",
            ],
            "hints": ["Look for 64 steps and A/B/C/D state."],
        },
        {
            "name": "SHA1",
            "markers": [
                r"0x5A827999|0x6ED9EBA1|0x8F1BBCDC|0xCA62C1D6",
                r"80\s*rounds|for\s*\(.*<\s*80|range\(80\)",
                r"\bsha1\b",
            ],
            "hints": ["Check for W[80] schedule and 5-word state."],
        },
        {
            "name": "SHA256",
            "markers": [
                r"0x428a2f98|0x71374491|0xb5c0fbcf",
                r"K\[64\]",
                r"\bsigma0\b|\bsigma1\b|\bSigma0\b|\bSigma1\b",
            ],
            "hints": ["Check for 64 rounds and message schedule W[64]."],
        },
    ]

    matches = []
    for rule in rules:
        hits = _find_all(rule["markers"], text)
        if hits:
            score = len(hits)
            matches.append({
                "name": rule["name"],
                "confidence": min(1.0, score / max(1, len(rule["markers"]))),
                "evidence": hits,
                "notes": rule["hints"],
            })

    matches.sort(key=lambda m: m["confidence"], reverse=True)

    summary = "No strong matches" if not matches else f"Top match: {matches[0]['name']}"
    return {
        "summary": summary,
        "matches": matches,
        "notes": ["Rule-based match; validate with constants and control flow."]
        if matches
        else ["Try including more of the function or constants arrays."],
    }
