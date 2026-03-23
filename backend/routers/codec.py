from fastapi import APIRouter, HTTPException

from backend.schemas import (
    AesRequest,
    ConvertRequest,
    DecodeRequest,
    DesRequest,
    EncodeRequest,
    FormatRequest,
    IdaAnalyzeRequest,
    Md5Request,
    PipelineRequest,
    Rc4Request,
    RegexGenerateRequest,
    Sm4Request,
    TripleDesRequest,
)
from backend.services.text_tools import convert_format, swap_endian
from backend.state import sbox_manager
from core.analysis.ida_pseudocode import analyze_ida_pseudocode
from core.decoder.aes_pure import AesPureEncoders
from core.decoder.base import BaseEncoders
from core.decoder.des import DESEncoders
from core.decoder.html import HtmlEncoders
from core.decoder.md5 import MD5Encoders
from core.decoder.pipeline import OPERATION_REGISTRY, Operation, Pipeline
from core.decoder.rc4 import RC4Encoders
from core.decoder.sm4 import SM4Encoders
from core.decoder.unicode import UnicodeEncoders
from core.decoder.url import UrlEncoders
from core.formatter import CssFormatter, HtmlFormatter, JsonFormatter, SqlFormatter, XmlFormatter

try:
    from core.formatter import PythonFormatter
except ImportError:
    PythonFormatter = None


router = APIRouter()


def _raise_bad_request(exc: Exception):
    raise HTTPException(status_code=400, detail=str(exc))


@router.post("/api/base64/encode")
def base64_encode(req: EncodeRequest):
    try:
        return {"result": BaseEncoders.base64_encode(req.data, url_safe=req.params.get("url_safe", False))}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/base64/decode")
def base64_decode(req: DecodeRequest):
    try:
        return {"result": BaseEncoders.base64_decode(req.data, url_safe=req.params.get("url_safe", False))}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/base32/encode")
def base32_encode(req: EncodeRequest):
    try:
        return {"result": BaseEncoders.base32_encode(req.data)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/base32/decode")
def base32_decode(req: DecodeRequest):
    try:
        return {"result": BaseEncoders.base32_decode(req.data)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/base16/encode")
def base16_encode(req: EncodeRequest):
    try:
        return {"result": BaseEncoders.base16_encode(req.data)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/base16/decode")
def base16_decode(req: DecodeRequest):
    try:
        return {"result": BaseEncoders.base16_decode(req.data)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/base85/encode")
def base85_encode(req: EncodeRequest):
    try:
        return {"result": BaseEncoders.base85_encode(req.data, variant=req.params.get("variant", "ascii85"))}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/base85/decode")
def base85_decode(req: DecodeRequest):
    try:
        return {"result": BaseEncoders.base85_decode(req.data, variant=req.params.get("variant", "ascii85"))}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/html/encode")
def html_encode(req: EncodeRequest):
    return {"result": HtmlEncoders.html_encode(req.data)}


@router.post("/api/html/decode")
def html_decode(req: EncodeRequest):
    return {"result": HtmlEncoders.html_decode(req.data)}


@router.post("/api/url/encode")
def url_encode(req: EncodeRequest):
    return {"result": UrlEncoders.url_encode(req.data)}


@router.post("/api/url/decode")
def url_decode(req: EncodeRequest):
    return {"result": UrlEncoders.url_decode(req.data)}


@router.post("/api/unicode/encode")
def unicode_encode(req: EncodeRequest):
    return {"result": UnicodeEncoders.unicode_encode(req.data)}


@router.post("/api/unicode/decode")
def unicode_decode(req: EncodeRequest):
    return {"result": UnicodeEncoders.unicode_decode(req.data)}


@router.post("/api/format")
def format_code(req: FormatRequest):
    try:
        fmt_type = req.type.lower()
        if fmt_type == "json":
            result = JsonFormatter.format_json(req.data, indent=req.indent)
        elif fmt_type == "python":
            if PythonFormatter is None:
                raise HTTPException(status_code=500, detail="Python formatter not initialized")
            result = PythonFormatter.format_python(req.data)
        elif fmt_type == "xml":
            result = XmlFormatter.format_xml(req.data, indent=req.indent)
        elif fmt_type == "html":
            result = HtmlFormatter.format_html(req.data, indent=req.indent)
        elif fmt_type == "sql":
            result = SqlFormatter.format_sql(req.data, indent=req.indent)
        elif fmt_type == "css":
            result = CssFormatter.format_css(req.data, indent=req.indent)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format type: {fmt_type}")

        if result.startswith("[错误]"):
            raise HTTPException(status_code=400, detail=result)
        return {"result": result}
    except HTTPException:
        raise
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/regex/escape")
def regex_escape(req: EncodeRequest):
    try:
        from core.regex import RegexUtils

        return {"result": RegexUtils.escape_text(req.data)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/regex/generate")
def regex_generate(req: RegexGenerateRequest):
    try:
        from core.regex import RegexGenerator

        return {
            "result": RegexGenerator.generate_pattern(
                include_digits=req.include_digits,
                include_lower=req.include_lower,
                include_upper=req.include_upper,
                custom_chars=req.custom_chars,
                exclude_chars=req.exclude_chars,
            )
        }
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/aes/encrypt")
def aes_encrypt(req: AesRequest):
    try:
        return {
            "result": AesPureEncoders.encrypt(
                req.data,
                req.key,
                req.mode,
                req.iv,
                req.padding,
                sbox=sbox_manager.get_sbox(req.sbox_name),
                swap_key_schedule=req.swap_key_schedule,
                swap_data_round=req.swap_data_round,
                key_type=req.key_type,
                iv_type=req.iv_type,
                data_type=req.data_type,
            )
        }
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/aes/decrypt")
def aes_decrypt(req: AesRequest):
    try:
        return {
            "result": AesPureEncoders.decrypt(
                req.data,
                req.key,
                req.mode,
                req.iv,
                req.padding,
                sbox=sbox_manager.get_sbox(req.sbox_name),
                swap_key_schedule=req.swap_key_schedule,
                swap_data_round=req.swap_data_round,
                key_type=req.key_type,
                iv_type=req.iv_type,
                data_type=req.data_type,
            )
        }
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/sm4/encrypt")
def sm4_encrypt(req: Sm4Request):
    try:
        return {
            "result": SM4Encoders.sm4_encrypt(
                req.data,
                req.key,
                req.mode,
                req.iv,
                req.padding,
                sbox=sbox_manager.get_sbox(req.sbox_name),
                key_type=req.key_type,
                iv_type=req.iv_type,
                swap_key_schedule=req.swap_key_schedule,
                swap_data_round=req.swap_data_round,
                swap_endian=req.swap_endian,
                data_type=req.data_type,
            )
        }
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/sm4/decrypt")
def sm4_decrypt(req: Sm4Request):
    try:
        return {
            "result": SM4Encoders.sm4_decrypt(
                req.data,
                req.key,
                req.mode,
                req.iv,
                req.padding,
                sbox=sbox_manager.get_sbox(req.sbox_name),
                key_type=req.key_type,
                iv_type=req.iv_type,
                swap_key_schedule=req.swap_key_schedule,
                swap_data_round=req.swap_data_round,
                swap_endian=req.swap_endian,
                data_type=req.data_type,
            )
        }
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/des/encrypt")
def des_encrypt(req: DesRequest):
    try:
        return {"result": DESEncoders.des_encrypt(req.data, req.key, req.mode, req.iv, req.padding, sboxes=req.sboxes, key_type=req.key_type, iv_type=req.iv_type, data_type=req.data_type)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/des/decrypt")
def des_decrypt(req: DesRequest):
    try:
        return {"result": DESEncoders.des_decrypt(req.data, req.key, req.mode, req.iv, req.padding, sboxes=req.sboxes, key_type=req.key_type, iv_type=req.iv_type, data_type=req.data_type)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/3des/encrypt")
def triple_des_encrypt(req: TripleDesRequest):
    try:
        return {"result": DESEncoders.triple_des_encrypt(req.data, req.key, req.mode, req.iv, req.padding, sboxes=req.sboxes, key_type=req.key_type, iv_type=req.iv_type, data_type=req.data_type)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/3des/decrypt")
def triple_des_decrypt(req: TripleDesRequest):
    try:
        return {"result": DESEncoders.triple_des_decrypt(req.data, req.key, req.mode, req.iv, req.padding, sboxes=req.sboxes, key_type=req.key_type, iv_type=req.iv_type, data_type=req.data_type)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/md5/hash")
def md5_hash(req: Md5Request):
    try:
        return {"result": MD5Encoders.md5_hash(req.data, output_format=req.output_format, init_values=req.init_values, k_table=req.k_table, shifts=req.shifts, data_type=req.data_type, salt=req.salt, salt_position=req.salt_position)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/rc4/encrypt")
def rc4_encrypt(req: Rc4Request):
    try:
        return {"result": RC4Encoders.rc4_encrypt(req.data, req.key, swap_bytes=req.swap_bytes, sbox=req.sbox, key_type=req.key_type, data_type=req.data_type)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/rc4/decrypt")
def rc4_decrypt(req: Rc4Request):
    try:
        return {"result": RC4Encoders.rc4_decrypt(req.data, req.key, swap_bytes=req.swap_bytes, sbox=req.sbox, key_type=req.key_type, data_type=req.data_type)}
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/pipeline/run")
def pipeline_run(req: PipelineRequest):
    try:
        pipeline = Pipeline(input_format=req.input_format, output_format=req.output_format)
        for op_info in req.operations:
            if op_info.name not in OPERATION_REGISTRY:
                raise HTTPException(status_code=400, detail=f"Operation {op_info.name} not registered")
            params = op_info.params.copy()
            if "sbox_name" in params:
                params["sbox"] = sbox_manager.get_sbox(params["sbox_name"])
            pipeline.add_operation(Operation(op_info.name, OPERATION_REGISTRY[op_info.name], params))
        return {"result": pipeline.run(req.data)}
    except HTTPException:
        raise
    except Exception as exc:
        _raise_bad_request(exc)


@router.post("/api/utils/convert_format")
def convert_text_format(req: ConvertRequest):
    return {"result": convert_format(req.data, req.from_fmt, req.to_fmt, req.separator)}


@router.post("/api/utils/endian_swap")
def endian_swap(req: ConvertRequest):
    return {"result": swap_endian(req.data, req.from_fmt, req.separator)}


@router.post("/api/ida/analyze")
def ida_analyze(req: IdaAnalyzeRequest):
    try:
        return analyze_ida_pseudocode(req.code)
    except Exception as exc:
        _raise_bad_request(exc)
