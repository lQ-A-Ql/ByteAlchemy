#!/usr/bin/env python3
"""Verification: Pipeline decrypt with Chinese text containing newlines."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.decoder.pipeline import Pipeline, Operation, OPERATION_REGISTRY

EXPECTED_PLAINTEXT = """ 驱动器 C 中的卷没有标签。
 卷的序列号是 1C52-70EC

 C:\\Users\\Administrator\\Desktop 的目录

2025/10/28  14:23    <DIR>          .
2025/10/28  14:23    <DIR>          ..
2025/10/28  12:58             2,404 important.txt
2025/10/28  14:22        59,480,000 Wireshark-win64-3.0.0.exe
               2 个文件     59,482,404 字节
               2 个目录 49,289,793,536 可用字节
"""

CIPHERTEXT_HEX = (
    "fb8d7be483996de151880ab8e4d958a650d4f4be7983208e2a55cfc784383a4b"
    "a5305ea22abb334d68d5636d4ef590953064228339fa37e17b2a82c315e45461"
    "03eb0af047b80b8bb2cd08a782abac9c16d27e14cf4e9cb835d5d252e9b4ec2d"
    "958ea2738c7baf53f1a350de162c1a92b5057b52d3acc119f7af9228f9dc63ab"
    "034113a3a0c2a490b73d964c6fd71ab9d0194c2c23034209e22272ee77daa2bd"
    "ba739ec90b5897ddbe346ee10c13c32ae5d7039e72075b235abad90d92e97b8a"
    "79778298a8ce53ed6d667399422517a4e048670eef70344a079441e0c887b246"
    "801adda5da76533aed79b8d9c0bb42aeb39b6ccd6b662b5e52ae074fbb5b6ee8"
    "d52e7a34516e155895d11591542bc9e2cb01e76f730d08fe8cbe33ee51fd345c"
    "3457f1d5d6095612ddd185fa1f71915432aa22612b49cb63757f2db9f435f83b"
    "b2c5f661f71015e3214132e2087be454d9e737d0272cad53ef8c69ae2f70e148"
    "dbe8302f9467491006643ab83e9866d6eacd85cadd298b5f51c4f33c4c9dce8a"
    "ea5c326185100bc4c45256c28b57c5e2b6cd4a2421f20d650074c50b114e903c"
)

print("=== Test: RC4+XOR Pipeline Decrypt (Chinese + newlines) ===")
pipeline = Pipeline(input_format='hex', output_format='utf-8')
pipeline.add_operation(Operation('rc4_decrypt', OPERATION_REGISTRY['rc4_decrypt'], {
    'key': '32662c04-a363-4288-8131-f7912004f0f6',
    'key_type': 'utf-8',
}))
pipeline.add_operation(Operation('xor_bytes', OPERATION_REGISTRY['xor_bytes'], {
    'key': 'TheSecretKeyyyy',
    'key_type': 'utf-8',
}))
result = pipeline.run(CIPHERTEXT_HEX)

normalized_result = result.replace('\r\n', '\n').strip()
normalized_expected = EXPECTED_PLAINTEXT.replace('\r\n', '\n').strip()

print(f"Result:\n{result}")
print()

if normalized_result == normalized_expected:
    print("[PASS] Chinese text with newlines decrypted correctly!")
else:
    print("[FAIL] Output does not match expected plaintext")
    print(f"Expected (hex): {EXPECTED_PLAINTEXT.encode('utf-8').hex()}")
    print(f"Got (hex):      {result.encode('utf-8').hex()[:200]}...")

# Also run previous test
print("\n=== Test: RC4+XOR Pipeline Decrypt (ASCII) ===")
p2 = Pipeline(input_format='hex', output_format='utf-8')
p2.add_operation(Operation('rc4_decrypt', OPERATION_REGISTRY['rc4_decrypt'], {
    'key': '32662c04-a363-4288-8131-f7912004f0f6',
    'key_type': 'utf-8',
}))
p2.add_operation(Operation('xor_bytes', OPERATION_REGISTRY['xor_bytes'], {
    'key': 'TheSecretKeyyyy',
    'key_type': 'utf-8',
}))
r2 = p2.run('b30ba1210872a861')
if r2 == 'hostname':
    print("[PASS] ASCII decryption still works!")
else:
    print(f"[FAIL] Expected 'hostname', got '{r2}'")
