#!/usr/bin/env python3
"""Verification test for Pipeline hex internal format fix."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.decoder.pipeline import Pipeline, Operation, OPERATION_REGISTRY

passed = 0
failed = 0

def check(name, got, expected):
    global passed, failed
    ok = got == expected
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name}")
    if not ok:
        print(f"    Expected: {repr(expected)}")
        print(f"    Got:      {repr(got)}")
        failed += 1
    else:
        passed += 1

# Test 1: RC4 decrypt -> XOR decrypt pipeline
print("Test 1: RC4+XOR Pipeline Decrypt")
p1 = Pipeline(input_format='hex', output_format='utf-8')
p1.add_operation(Operation('rc4_decrypt', OPERATION_REGISTRY['rc4_decrypt'], {
    'key': '32662c04-a363-4288-8131-f7912004f0f6',
    'key_type': 'utf-8',
}))
p1.add_operation(Operation('xor_bytes', OPERATION_REGISTRY['xor_bytes'], {
    'key': 'TheSecretKeyyyy',
    'key_type': 'utf-8',
}))
r1 = p1.run('b30ba1210872a861')
check("Decrypt b30ba1210872a861 -> hostname", r1, "hostname")

# Test 2: XOR encrypt -> RC4 encrypt pipeline
print("Test 2: XOR+RC4 Pipeline Encrypt")
p2 = Pipeline(input_format='utf-8', output_format='hex')
p2.add_operation(Operation('xor_bytes', OPERATION_REGISTRY['xor_bytes'], {
    'key': 'TheSecretKeyyyy',
    'key_type': 'utf-8',
}))
p2.add_operation(Operation('rc4_encrypt', OPERATION_REGISTRY['rc4_encrypt'], {
    'key': '32662c04-a363-4288-8131-f7912004f0f6',
    'key_type': 'utf-8',
}))
r2 = p2.run('hostname')
check("Encrypt hostname -> b30ba1210872a861", r2, "b30ba1210872a861")

# Test 3: Roundtrip
print("Test 3: Roundtrip")
p3 = Pipeline(input_format='hex', output_format='utf-8')
p3.add_operation(Operation('rc4_decrypt', OPERATION_REGISTRY['rc4_decrypt'], {
    'key': '32662c04-a363-4288-8131-f7912004f0f6',
    'key_type': 'utf-8',
}))
p3.add_operation(Operation('xor_bytes', OPERATION_REGISTRY['xor_bytes'], {
    'key': 'TheSecretKeyyyy',
    'key_type': 'utf-8',
}))
r3 = p3.run(r2)
check("Roundtrip result", r3, "hostname")

# Test 4: Single-step RC4 decrypt (standalone, no pipeline corruption)
print("Test 4: Single RC4 Decrypt (hex output)")
from core.decoder.rc4 import RC4Encoders
r4 = RC4Encoders.rc4_decrypt(
    'b30ba1210872a861',
    '32662c04-a363-4288-8131-f7912004f0f6',
    data_type='hex',
    output_format='hex'
)
check("RC4 decrypt hex output", r4, "3c0716270b021f00")

# Test 5: Hex output format for pipeline
print("Test 5: Pipeline with hex output")
p5 = Pipeline(input_format='hex', output_format='hex')
p5.add_operation(Operation('rc4_decrypt', OPERATION_REGISTRY['rc4_decrypt'], {
    'key': '32662c04-a363-4288-8131-f7912004f0f6',
    'key_type': 'utf-8',
}))
p5.add_operation(Operation('xor_bytes', OPERATION_REGISTRY['xor_bytes'], {
    'key': 'TheSecretKeyyyy',
    'key_type': 'utf-8',
}))
r5 = p5.run('b30ba1210872a861')
check("Pipeline hex output", r5, "686f73746e616d65")

print(f"\n{'='*40}")
print(f"Results: {passed} passed, {failed} failed")
if failed == 0:
    print("ALL TESTS PASSED!")
else:
    print("SOME TESTS FAILED!")
    sys.exit(1)
