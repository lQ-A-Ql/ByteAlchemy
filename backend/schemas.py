from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EncodeRequest(BaseModel):
    data: str
    params: Dict[str, Any] = Field(default_factory=dict)


class DecodeRequest(BaseModel):
    data: str
    params: Dict[str, Any] = Field(default_factory=dict)


class FormatRequest(BaseModel):
    data: str
    type: str
    indent: int = 4


class RegexGenerateRequest(BaseModel):
    include_digits: bool = False
    include_lower: bool = False
    include_upper: bool = False
    custom_chars: str = ""
    exclude_chars: str = ""


class PipelineOperation(BaseModel):
    name: str
    params: Dict[str, Any] = Field(default_factory=dict)


class PipelineRequest(BaseModel):
    data: str
    operations: List[PipelineOperation]
    input_format: str = "hex"
    output_format: str = "utf-8"


class ConvertRequest(BaseModel):
    data: str
    from_fmt: str
    to_fmt: str
    separator: Optional[str] = None


class IdaAnalyzeRequest(BaseModel):
    code: str


class AesRequest(BaseModel):
    data: str
    key: str
    mode: str = "CBC"
    iv: str = ""
    padding: str = "pkcs7"
    sbox_name: Optional[str] = "Standard AES"
    key_type: str = "utf-8"
    iv_type: str = "utf-8"
    swap_key_schedule: bool = False
    swap_data_round: bool = False
    data_type: Optional[str] = None


class Sm4Request(BaseModel):
    data: str
    key: str
    mode: str = "ECB"
    iv: str = ""
    padding: str = "pkcs7"
    sbox_name: Optional[str] = "Standard SM4"
    key_type: str = "utf-8"
    iv_type: str = "utf-8"
    swap_endian: bool = False
    swap_key_schedule: bool = False
    swap_data_round: bool = False
    data_type: Optional[str] = None


class DesRequest(BaseModel):
    data: str
    key: str
    mode: str = "ECB"
    iv: str = ""
    padding: str = "pkcs7"
    sboxes: Optional[str] = None
    key_type: str = "utf-8"
    iv_type: str = "utf-8"
    data_type: Optional[str] = None


class TripleDesRequest(BaseModel):
    data: str
    key: str
    mode: str = "ECB"
    iv: str = ""
    padding: str = "pkcs7"
    sboxes: Optional[str] = None
    key_type: str = "utf-8"
    iv_type: str = "utf-8"
    data_type: Optional[str] = None


class Md5Request(BaseModel):
    data: str
    output_format: str = "hex"
    init_values: Optional[str] = None
    k_table: Optional[str] = None
    shifts: Optional[str] = None
    data_type: Optional[str] = None
    salt: Optional[str] = ""
    salt_position: Optional[str] = "suffix"


class Rc4Request(BaseModel):
    data: str
    key: str
    swap_bytes: bool = False
    sbox: Optional[str] = None
    key_type: str = "utf-8"
    data_type: Optional[str] = None


class SBoxSaveRequest(BaseModel):
    name: str
    content: str


class ScriptCreateRequest(BaseModel):
    name: str
    content: str
    description: str = ""


class ScriptUpdateRequest(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None


class KeyBlockChain(BaseModel):
    blocks: List[Dict[str, Any]]
    func_name: str = "transform_key"
    args: str = "data"


class KeyExecuteRequest(BaseModel):
    code: str
    input_hex: str = ""


class KeyParseRequest(BaseModel):
    code: str


class CustomBlockRequest(BaseModel):
    block_id: str
    block_def: Dict[str, Any]
