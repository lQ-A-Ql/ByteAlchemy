#!/usr/bin/env python3
"""Regression tests for decoder pipeline byte handoff and step validation."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.decoder.pipeline import Pipeline, Operation, OPERATION_REGISTRY

passed = 0
failed = 0


def check(name, got, expected):
    global passed, failed
    ok = got == expected
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    if ok:
        passed += 1
    else:
        failed += 1
        print(f"    Expected: {expected!r}")
        print(f"    Got:      {got!r}")


print("Test 1: Base64 text roundtrip")
p1 = Pipeline(input_format='utf-8', output_format='utf-8')
p1.add_operation(Operation('base64_encode', OPERATION_REGISTRY['base64_encode']))
p1.add_operation(Operation('base64_decode', OPERATION_REGISTRY['base64_decode']))
check('Base64 encode/decode keeps UTF-8 text', p1.run('Hello 世界'), 'Hello 世界')

print("Test 2: HTML entity roundtrip")
p2 = Pipeline(input_format='utf-8', output_format='utf-8')
p2.add_operation(Operation('html_encode', OPERATION_REGISTRY['html_encode']))
p2.add_operation(Operation('html_decode', OPERATION_REGISTRY['html_decode']))
check('HTML encode/decode keeps reserved chars', p2.run('Tom & Jerry <script>"\''), 'Tom & Jerry <script>"\'')

print("Test 3: Binary handoff through Base64")
p3 = Pipeline(input_format='utf-8', output_format='utf-8')
p3.add_operation(Operation('rc4_encrypt', OPERATION_REGISTRY['rc4_encrypt'], {
    'key': 'pipeline-secret',
    'key_type': 'utf-8',
}))
p3.add_operation(Operation('base64_encode', OPERATION_REGISTRY['base64_encode']))
p3.add_operation(Operation('base64_decode', OPERATION_REGISTRY['base64_decode']))
p3.add_operation(Operation('rc4_decrypt', OPERATION_REGISTRY['rc4_decrypt'], {
    'key': 'pipeline-secret',
    'key_type': 'utf-8',
}))
check('RC4 ciphertext survives Base64 encode/decode chain', p3.run('Hello 世界'), 'Hello 世界')

print("Test 4: AES roundtrip keeps hex-like plaintext")
aes_params = {
    'key': 'pipeline-secret',
    'mode': 'ECB',
    'padding': 'pkcs7',
    'key_type': 'utf-8',
    'iv_type': 'utf-8',
}
p4 = Pipeline(input_format='utf-8', output_format='utf-8')
p4.add_operation(Operation('aes_encrypt', OPERATION_REGISTRY['aes_encrypt'], aes_params.copy()))
p4.add_operation(Operation('aes_decrypt', OPERATION_REGISTRY['aes_decrypt'], aes_params.copy()))
check('AES encrypt/decrypt does not misread hex-like plaintext', p4.run('deadbeef'), 'deadbeef')

print("Test 5: Operation params stay immutable across runs")
original_params = {'key': '41', 'key_type': 'hex'}
op = Operation('xor_bytes', OPERATION_REGISTRY['xor_bytes'], original_params.copy())
p5 = Pipeline(input_format='utf-8', output_format='hex')
p5.add_operation(op)
first = p5.run('BC')
second = p5.run('BC')
check('XOR result is stable across repeated runs', first, second)
check('Operation params are not mutated by pipeline', op.params, original_params)

print("Test 6: Invalid text transition is rejected")
p6 = Pipeline(input_format='utf-8', output_format='utf-8')
p6.add_operation(Operation('aes_encrypt', OPERATION_REGISTRY['aes_encrypt'], aes_params.copy()))
p6.add_operation(Operation('html_encode', OPERATION_REGISTRY['html_encode']))
try:
    p6.run('Hello 世界')
except ValueError as exc:
    check('Binary to text misuse surfaces validation error', '需要 UTF-8 文本输入' in str(exc), True)
else:
    check('Binary to text misuse surfaces validation error', False, True)

print(f"\nResults: {passed} passed, {failed} failed")
if failed:
    sys.exit(1)
