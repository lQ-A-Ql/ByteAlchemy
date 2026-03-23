import { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import {
  Binary,
  ChevronDown,
  Code2,
  Fingerprint,
  GripVertical,
  Hash,
  Key,
  Link,
  Lock,
  Shield,
  ShieldCheck,
  Type,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { OperationType } from './EncodingTypesList';
import type { EncodingOperation } from '@/features/decoder/types';
import { MiniSelect } from '@/shared/components/CustomSelect';

interface EncodingChainProps {
  chain: EncodingOperation[];
  onRemove: (id: string) => void;
  onUpdateParams: (id: string, params: Record<string, any>) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onToggle: (id: string) => void;
  onClear?: () => void;
  sboxNames: string[];
  input: string;
  inputFormat: string;
  inputPreprocess: {
    stripHexPrefix: boolean;
    stripHexEscape: boolean;
    removeSeparators: boolean;
    autoPadOdd: boolean;
  };
  onUpsertXorKey: (keyHex: string) => void;
}

const iconMap: Record<string, any> = {
  base64_encode: Binary, base64_decode: Binary,
  base32_encode: Binary, base32_decode: Binary,
  base16_encode: Hash, base16_decode: Hash,
  base85_encode: Binary, base85_decode: Binary,
  url_encode: Link, url_decode: Link,
  html_encode: Code2, html_decode: Code2,
  unicode_encode: Type, unicode_decode: Type,
  md5_hash: Fingerprint, sha1_hash: Fingerprint, sha256_hash: Fingerprint, sha512_hash: Fingerprint,
  xor_bytes: Key, known_plaintext_helper: Key,
  rc4_encrypt: Key, rc4_decrypt: Key,
  chacha20_encrypt: Key, chacha20_decrypt: Key,
  salsa20_encrypt: Key, salsa20_decrypt: Key,
  des_encrypt: Shield, des_decrypt: Shield,
  triple_des_encrypt: ShieldCheck, triple_des_decrypt: ShieldCheck,
  blowfish_encrypt: Shield, blowfish_decrypt: Shield,
  cast_encrypt: Shield, cast_decrypt: Shield,
  arc2_encrypt: Shield, arc2_decrypt: Shield,
  aes_encrypt: Lock, aes_decrypt: Lock,
  sm4_encrypt: Lock, sm4_decrypt: Lock,
};

const colorMap: Record<string, string> = {
  base64_encode: 'from-pink-500 to-rose-500', base64_decode: 'from-pink-500 to-rose-500',
  base32_encode: 'from-pink-500 to-rose-500', base32_decode: 'from-pink-500 to-rose-500',
  base16_encode: 'from-pink-500 to-rose-500', base16_decode: 'from-pink-500 to-rose-500',
  base85_encode: 'from-pink-500 to-rose-500', base85_decode: 'from-pink-500 to-rose-500',
  url_encode: 'from-pink-500 to-rose-500', url_decode: 'from-pink-500 to-rose-500',
  html_encode: 'from-pink-500 to-rose-500', html_decode: 'from-pink-500 to-rose-500',
  unicode_encode: 'from-pink-500 to-rose-500', unicode_decode: 'from-pink-500 to-rose-500',
  md5_hash: 'from-amber-500 to-orange-500', sha1_hash: 'from-amber-500 to-orange-500',
  sha256_hash: 'from-amber-500 to-orange-500', sha512_hash: 'from-amber-500 to-orange-500',
  xor_bytes: 'from-sky-500 to-cyan-500', known_plaintext_helper: 'from-sky-500 to-cyan-500',
  rc4_encrypt: 'from-purple-500 to-pink-500', rc4_decrypt: 'from-purple-500 to-pink-500',
  chacha20_encrypt: 'from-purple-500 to-pink-500', chacha20_decrypt: 'from-purple-500 to-pink-500',
  salsa20_encrypt: 'from-purple-500 to-pink-500', salsa20_decrypt: 'from-purple-500 to-pink-500',
  des_encrypt: 'from-purple-500 to-pink-500', des_decrypt: 'from-purple-500 to-pink-500',
  triple_des_encrypt: 'from-purple-500 to-pink-500', triple_des_decrypt: 'from-purple-500 to-pink-500',
  blowfish_encrypt: 'from-purple-500 to-pink-500', blowfish_decrypt: 'from-purple-500 to-pink-500',
  cast_encrypt: 'from-purple-500 to-pink-500', cast_decrypt: 'from-purple-500 to-pink-500',
  arc2_encrypt: 'from-purple-500 to-pink-500', arc2_decrypt: 'from-purple-500 to-pink-500',
  aes_encrypt: 'from-purple-500 to-pink-500', aes_decrypt: 'from-purple-500 to-pink-500',
  sm4_encrypt: 'from-purple-500 to-pink-500', sm4_decrypt: 'from-purple-500 to-pink-500',
};

const labelMap: Record<string, string> = {
  base64_encode: 'Base64 编码', base64_decode: 'Base64 解码',
  base32_encode: 'Base32 编码', base32_decode: 'Base32 解码',
  base16_encode: 'Base16 编码', base16_decode: 'Base16 解码',
  base85_encode: 'Base85 编码', base85_decode: 'Base85 解码',
  url_encode: 'URL 编码', url_decode: 'URL 解码',
  html_encode: 'HTML 编码', html_decode: 'HTML 解码',
  unicode_encode: 'Unicode 编码', unicode_decode: 'Unicode 解码',
  md5_hash: 'MD5 哈希', sha1_hash: 'SHA1 哈希', sha256_hash: 'SHA256 哈希', sha512_hash: 'SHA512 哈希',
  xor_bytes: 'XOR 字节处理', known_plaintext_helper: '已知明文辅助',
  rc4_encrypt: 'RC4 加密', rc4_decrypt: 'RC4 解密',
  chacha20_encrypt: 'ChaCha20 加密', chacha20_decrypt: 'ChaCha20 解密',
  salsa20_encrypt: 'Salsa20 加密', salsa20_decrypt: 'Salsa20 解密',
  des_encrypt: 'DES 加密', des_decrypt: 'DES 解密',
  triple_des_encrypt: '3DES 加密', triple_des_decrypt: '3DES 解密',
  blowfish_encrypt: 'Blowfish 加密', blowfish_decrypt: 'Blowfish 解密',
  cast_encrypt: 'CAST5 加密', cast_decrypt: 'CAST5 解密',
  arc2_encrypt: 'RC2/ARC2 加密', arc2_decrypt: 'RC2/ARC2 解密',
  aes_encrypt: 'AES 加密', aes_decrypt: 'AES 解密',
  sm4_encrypt: 'SM4 加密', sm4_decrypt: 'SM4 解密',
};

const hasParams = (type: OperationType) => (
  type.includes('aes')
  || type.includes('sm4')
  || type.includes('des')
  || type.includes('rc4')
  || type.includes('blowfish')
  || type.includes('cast')
  || type.includes('arc2')
  || type.includes('chacha20')
  || type.includes('salsa20')
  || type.includes('sha')
  || type === 'md5_hash'
  || type === 'xor_bytes'
  || type === 'known_plaintext_helper'
);

export function EncodingChain({
  chain,
  onRemove,
  onUpdateParams,
  onMove,
  onToggle,
  onClear,
  sboxNames,
  input,
  inputFormat,
  inputPreprocess,
  onUpsertXorKey,
}: EncodingChainProps) {
  const activeCount = chain.filter((operation) => operation.enabled).length;
  const disabledCount = chain.length - activeCount;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-md">
      <div className="mb-4 flex flex-shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-medium text-slate-800">
            <div className="h-5 w-1 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
            操作链
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700 ring-1 ring-purple-200">
              总计 {chain.length}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">
              已启用 {activeCount}
            </span>
            {disabledCount > 0 && (
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
                已停用 {disabledCount}
              </span>
            )}
          </div>
        </div>

        {chain.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-purple-100 transition-all hover:bg-purple-50 hover:text-purple-700"
          >
            清空链路
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {chain.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div className="w-full rounded-2xl border-2 border-dashed border-slate-200 p-6 text-sm text-slate-400">
              <div className="mb-2">从左侧挑选操作，逐步拼出你的解码链路。</div>
              <div className="text-xs text-slate-350">支持拖拽排序、折叠参数面板，以及逐步启用或停用。</div>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {chain.map((operation, index) => (
              <ChainItem
                key={operation.id}
                operation={operation}
                index={index}
                onRemove={onRemove}
                onUpdateParams={onUpdateParams}
                onMove={onMove}
                onToggle={onToggle}
                sboxNames={sboxNames}
                input={input}
                inputFormat={inputFormat}
                inputPreprocess={inputPreprocess}
                onUpsertXorKey={onUpsertXorKey}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

interface ChainItemProps {
  operation: EncodingOperation;
  index: number;
  onRemove: (id: string) => void;
  onUpdateParams: (id: string, params: Record<string, any>) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onToggle: (id: string) => void;
  sboxNames: string[];
  input: string;
  inputFormat: string;
  inputPreprocess: {
    stripHexPrefix: boolean;
    stripHexEscape: boolean;
    removeSeparators: boolean;
    autoPadOdd: boolean;
  };
  onUpsertXorKey: (keyHex: string) => void;
}

function ChainItem({
  operation,
  index,
  onRemove,
  onUpdateParams,
  onMove,
  onToggle,
  sboxNames,
  input,
  inputFormat,
  inputPreprocess,
  onUpsertXorKey,
}: ChainItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showParams, setShowParams] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'CHAIN_ITEM',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'CHAIN_ITEM',
    hover: (item: { index: number }) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const Icon = iconMap[operation.type] || Binary;
  const color = colorMap[operation.type] || 'from-slate-500 to-slate-600';
  const label = labelMap[operation.type] || operation.type;
  const showSettings = hasParams(operation.type);

  return (
    <motion.div
      ref={ref}
      className={`rounded-2xl border border-purple-100 bg-white/90 transition-all duration-200 ${
        isDragging ? 'scale-95 opacity-50' : 'hover:border-purple-200 hover:shadow-md'
      } ${!operation.enabled ? 'opacity-60' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className="cursor-move text-slate-400 transition-colors hover:text-purple-500">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color} shadow-sm`}>
            <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-800">{label}</div>
            <div className="text-xs text-slate-400">步骤 {index + 1}</div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggle(operation.id)}
              className={`h-5 w-8 rounded-full transition-colors ${operation.enabled ? 'bg-purple-500' : 'bg-slate-300'}`}
              title={operation.enabled ? '停用步骤' : '启用步骤'}
            >
              <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${operation.enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </button>
            {showSettings && (
              <button
                onClick={() => setShowParams(!showParams)}
                className={`rounded-lg p-1 transition-colors ${showParams ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-purple-100'}`}
                title={showParams ? '收起参数' : '展开参数'}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showParams ? 'rotate-180' : ''}`} />
              </button>
            )}
            <button
              onClick={() => onRemove(operation.id)}
              className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600"
              title="删除步骤"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showParams && showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2 border-t border-purple-100 pt-3">
                <ParamsPanel
                  operation={operation}
                  onUpdateParams={onUpdateParams}
                  sboxNames={sboxNames}
                  input={input}
                  inputFormat={inputFormat}
                  inputPreprocess={inputPreprocess}
                  onUpsertXorKey={onUpsertXorKey}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface ParamsPanelProps {
  operation: EncodingOperation;
  onUpdateParams: (id: string, params: Record<string, any>) => void;
  sboxNames: string[];
  input: string;
  inputFormat: string;
  inputPreprocess: {
    stripHexPrefix: boolean;
    stripHexEscape: boolean;
    removeSeparators: boolean;
    autoPadOdd: boolean;
  };
  onUpsertXorKey: (keyHex: string) => void;
}

function ParamsPanel({
  operation,
  onUpdateParams,
  sboxNames,
  input,
  inputFormat,
  inputPreprocess,
  onUpsertXorKey,
}: ParamsPanelProps) {
  const { type, params, id } = operation;
  const update = (key: string, value: any) => onUpdateParams(id, { ...params, [key]: value });

  const inputClass = 'w-full rounded-lg border border-purple-200 bg-white/70 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400';
  const labelClass = 'mb-1 block text-xs text-slate-600';

  const typeOptions = [
    { value: 'utf-8', label: 'UTF-8 文本' },
    { value: 'hex', label: 'HEX' },
  ];

  const outputFormatOptions = [
    { value: 'hex', label: 'HEX' },
    { value: 'base64', label: 'Base64' },
  ];

  const saltPositionOptions = [
    { value: 'prefix', label: '前缀' },
    { value: 'suffix', label: '后缀' },
    { value: 'both', label: '前后都加' },
  ];

  const modeOptions = ['ECB', 'CBC', 'CFB', 'OFB', 'CTR'].map((value) => ({ value, label: value }));
  const paddingOptions = ['pkcs7', 'zeropadding', 'iso10126', 'ansix923', 'nopadding'].map((value) => ({ value, label: value }));
  const sboxOptions = sboxNames.map((name) => ({ value: name, label: name }));
  const xorOutputOptions = [
    { value: 'hex', label: 'HEX' },
    { value: 'utf-8', label: 'UTF-8 文本' },
  ];

  const magicPresets = [
    { id: 'custom', label: '自定义', hex: '' },
    { id: 'png', label: 'PNG 头部', hex: '89504e470d0a1a0a' },
    { id: 'zip', label: 'ZIP 头部', hex: '504b0304' },
    { id: 'elf', label: 'ELF 头部', hex: '7f454c46' },
    { id: 'pe', label: 'PE 头部', hex: '4d5a' },
    { id: 'jpg', label: 'JPEG 头部', hex: 'ffd8ffe0' },
    { id: 'gzip', label: 'GZIP 头部', hex: '1f8b08' },
    { id: 'pdf', label: 'PDF 头部', hex: '25504446' },
  ];

  const normalizeHex = (value: string) => {
    let result = value;
    if (inputPreprocess.stripHexPrefix) {
      result = result.replace(/0x/gi, '');
    }
    if (inputPreprocess.stripHexEscape) {
      result = result.replace(/\\x/gi, '');
    }
    if (inputPreprocess.removeSeparators) {
      result = result.replace(/[^0-9a-fA-F]/g, '');
    }
    if (inputPreprocess.autoPadOdd && result.length % 2 !== 0) {
      result = `0${result}`;
    }
    return result;
  };

  const hexToBytes = (hex: string) => {
    const clean = hex.replace(/0x/gi, '').replace(/\\x/gi, '').replace(/[^0-9a-fA-F]/g, '');
    if (clean.length % 2 !== 0) {
      return null;
    }

    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(Number.parseInt(clean.slice(i, i + 2), 16));
    }
    return bytes;
  };

  const bytesToHex = (bytes: number[]) => bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const bytesToAscii = (bytes: number[]) => bytes.map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')).join('');

  if (type === 'xor_bytes') {
    return (
      <>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>密钥</label>
            <input
              type="text"
              value={params.key || ''}
              onChange={(event) => update('key', event.target.value)}
              placeholder="输入 HEX 或 UTF-8 文本"
              className={inputClass}
            />
          </div>
          <div className="w-28">
            <label className={labelClass}>密钥类型</label>
            <MiniSelect
              value={params.key_type || 'hex'}
              onChange={(value) => update('key_type', value)}
              options={typeOptions}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>输入类型</label>
            <MiniSelect
              value={params.data_type || 'hex'}
              onChange={(value) => update('data_type', value)}
              options={typeOptions}
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>输出格式</label>
            <MiniSelect
              value={params.output_format || 'hex'}
              onChange={(value) => update('output_format', value)}
              options={xorOutputOptions}
            />
          </div>
        </div>
        <div className="text-[10px] text-slate-500">适合处理重复密钥 XOR、简单字节混淆和自定义异或链路。</div>
      </>
    );
  }

  if (type === 'known_plaintext_helper') {
    const plainHex = params.preset && params.preset !== 'custom'
      ? (magicPresets.find((preset) => preset.id === params.preset)?.hex || '')
      : (params.plain_hex || '');

    const cipherHex = normalizeHex(input || '');
    const cipherBytes = hexToBytes(cipherHex || '');
    const plainBytes = hexToBytes(plainHex || '');
    let error: string | null = null;
    let keyRepeatHex = '';
    let bestLen = 0;
    let bestScore = 0;
    let previewHex = '';
    let previewAscii = '';

    if (cipherBytes && plainBytes && cipherBytes.length > 0 && plainBytes.length > 0) {
      if (plainBytes.length > cipherBytes.length) {
        error = '已知明文长度不能超过密文。';
      } else {
        const keyBytes = cipherBytes.slice(0, plainBytes.length).map((byte, idx) => byte ^ plainBytes[idx]);
        const maxLen = Math.min(32, keyBytes.length);
        let localBestLen = 1;
        let localBestScore = 0;

        for (let len = 1; len <= maxLen; len += 1) {
          let match = 0;
          for (let i = 0; i < keyBytes.length; i += 1) {
            if (keyBytes[i] === keyBytes[i % len]) {
              match += 1;
            }
          }

          const score = match / keyBytes.length;
          if (score > localBestScore + 0.001 || (Math.abs(score - localBestScore) < 0.001 && len < localBestLen)) {
            localBestScore = score;
            localBestLen = len;
          }
        }

        bestLen = localBestLen;
        bestScore = localBestScore;

        const useLen = params.use_repeat === false
          ? keyBytes.length
          : (Number.parseInt(params.repeat_len || '', 10) || bestLen);

        const keyRepeat = keyBytes.slice(0, useLen);
        const decryptedBytes = cipherBytes.map((byte, idx) => byte ^ keyRepeat[idx % keyRepeat.length]);
        keyRepeatHex = bytesToHex(keyRepeat);
        previewHex = bytesToHex(decryptedBytes.slice(0, 128));
        previewAscii = bytesToAscii(decryptedBytes.slice(0, 128));
      }
    }

    return (
      <>
        <div>
          <label className={labelClass}>明文预设</label>
          <MiniSelect
            value={params.preset || 'custom'}
            onChange={(value) => update('preset', value)}
            options={magicPresets.map((preset) => ({ value: preset.id, label: preset.label }))}
          />
        </div>
        <div>
          <label className={labelClass}>自定义明文 HEX</label>
          <input
            type="text"
            value={params.plain_hex || ''}
            onChange={(event) => update('plain_hex', event.target.value)}
            placeholder="仅在选择自定义时生效"
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={params.use_repeat !== false}
              onChange={(event) => update('use_repeat', event.target.checked)}
              className="rounded"
            />
            推断重复密钥
          </label>
          <input
            type="text"
            value={params.repeat_len || ''}
            onChange={(event) => update('repeat_len', event.target.value)}
            placeholder="长度"
            className="w-20 rounded-lg border border-purple-200 bg-white/70 px-2 py-1.5 text-xs"
          />
          <button
            onClick={() => onUpsertXorKey(keyRepeatHex)}
            disabled={!keyRepeatHex}
            className="ml-auto rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs text-white disabled:opacity-40"
          >
            写入 XOR
          </button>
        </div>
        {inputFormat !== 'HEX' && inputFormat !== 'AUTO' && (
          <div className="text-[10px] text-amber-600">输入格式为 HEX 或 AUTO 时效果最佳。</div>
        )}
        {error && <div className="text-[10px] text-red-600">{error}</div>}
        {!error && keyRepeatHex && (
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500">推断长度：{bestLen}，置信度 {Math.round(bestScore * 100)}%</div>
            <div className="text-[10px] text-slate-500">重复密钥 HEX</div>
            <div className="break-all rounded bg-sky-50 px-2 py-1 font-mono text-[11px] text-sky-700">{keyRepeatHex}</div>
            <div className="text-[10px] text-slate-500">解密预览</div>
            <div className="break-all rounded bg-sky-50 px-2 py-1 font-mono text-[11px] text-sky-700">{previewHex}</div>
            <div className="break-all rounded bg-white/80 px-2 py-1 font-mono text-[11px] text-slate-700">{previewAscii}</div>
          </div>
        )}
      </>
    );
  }

  if (type === 'md5_hash' || type.includes('sha')) {
    return (
      <>
        <div>
          <label className={labelClass}>输出格式</label>
          <MiniSelect
            value={params.output_format || 'hex'}
            onChange={(value) => update('output_format', value)}
            options={outputFormatOptions}
          />
        </div>
        <div>
          <label className={labelClass}>盐值</label>
          <input
            type="text"
            value={params.salt || ''}
            onChange={(event) => update('salt', event.target.value)}
            placeholder="输入 UTF-8 文本盐值"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>盐值位置</label>
          <MiniSelect
            value={params.salt_position || 'suffix'}
            onChange={(value) => update('salt_position', value)}
            options={saltPositionOptions}
          />
        </div>
      </>
    );
  }

  if (type.includes('rc4')) {
    return (
      <>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>密钥</label>
            <input
              type="text"
              value={params.key || ''}
              onChange={(event) => update('key', event.target.value)}
              placeholder="输入密钥"
              className={inputClass}
            />
          </div>
          <div className="w-28">
            <label className={labelClass}>密钥类型</label>
            <MiniSelect
              value={params.key_type || 'utf-8'}
              onChange={(value) => update('key_type', value)}
              options={typeOptions}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={params.swap_bytes || false}
            onChange={(event) => update('swap_bytes', event.target.checked)}
            className="rounded"
          />
          交换 S 盒字节顺序（Magic KSA）
        </label>
        <div>
          <label className={labelClass}>S-Box</label>
          <MiniSelect
            value={params.sbox_name || 'Standard RC4'}
            onChange={(value) => update('sbox_name', value)}
            options={sboxOptions}
          />
        </div>
      </>
    );
  }

  if (type.includes('chacha20') || type.includes('salsa20')) {
    const hint = '建议使用 32 字节密钥与 8 字节 Nonce，可输入 HEX 或 UTF-8 文本。';

    return (
      <>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>密钥</label>
            <input
              type="text"
              value={params.key || ''}
              onChange={(event) => update('key', event.target.value)}
              placeholder="输入密钥"
              className={inputClass}
            />
          </div>
          <div className="w-28">
            <label className={labelClass}>密钥类型</label>
            <MiniSelect
              value={params.key_type || 'utf-8'}
              onChange={(value) => update('key_type', value)}
              options={typeOptions}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Nonce</label>
            <input
              type="text"
              value={params.nonce || ''}
              onChange={(event) => update('nonce', event.target.value)}
              placeholder="可留空后续再补"
              className={inputClass}
            />
          </div>
          <div className="w-28">
            <label className={labelClass}>Nonce 类型</label>
            <MiniSelect
              value={params.nonce_type || 'utf-8'}
              onChange={(value) => update('nonce_type', value)}
              options={typeOptions}
            />
          </div>
        </div>
        <div className="text-[10px] text-slate-500">{hint}</div>
      </>
    );
  }

  const showIV = params.mode && params.mode !== 'ECB';
  const isSM4OrAES = type.includes('sm4') || type.includes('aes');
  const extraHint = type.includes('blowfish')
    ? 'Blowfish 密钥长度建议 4 到 56 字节，IV 为 8 字节。'
    : type.includes('cast')
      ? 'CAST5 密钥长度建议 5 到 16 字节，IV 为 8 字节。'
      : type.includes('arc2')
        ? 'RC2/ARC2 密钥长度建议 5 到 128 字节，IV 为 8 字节。'
        : '';

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>密钥</label>
          <input
            type="text"
            value={params.key || ''}
            onChange={(event) => update('key', event.target.value)}
            placeholder="输入密钥"
            className={inputClass}
          />
        </div>
        <div className="w-28">
          <label className={labelClass}>密钥类型</label>
          <MiniSelect
            value={params.key_type || 'utf-8'}
            onChange={(value) => update('key_type', value)}
            options={typeOptions}
          />
        </div>
      </div>

      {extraHint && <div className="text-[10px] text-slate-500">{extraHint}</div>}

      {showIV && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>IV</label>
            <input
              type="text"
              value={params.iv || ''}
              onChange={(event) => update('iv', event.target.value)}
              placeholder="输入初始向量"
              className={inputClass}
            />
          </div>
          <div className="w-28">
            <label className={labelClass}>IV 类型</label>
            <MiniSelect
              value={params.iv_type || 'utf-8'}
              onChange={(value) => update('iv_type', value)}
              options={typeOptions}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>模式</label>
          <MiniSelect
            value={params.mode || 'ECB'}
            onChange={(value) => update('mode', value)}
            options={modeOptions}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>填充</label>
          <MiniSelect
            value={params.padding || 'pkcs7'}
            onChange={(value) => update('padding', value)}
            options={paddingOptions}
          />
        </div>
      </div>

      {isSM4OrAES && (
        <>
          <div>
            <label className={labelClass}>S-Box</label>
            <MiniSelect
              value={params.sbox_name || sboxNames[0] || ''}
              onChange={(value) => update('sbox_name', value)}
              options={sboxOptions}
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={params.swap_key_schedule || false}
                onChange={(event) => update('swap_key_schedule', event.target.checked)}
                className="rounded"
              />
              交换密钥调度
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={params.swap_data_round || false}
                onChange={(event) => update('swap_data_round', event.target.checked)}
                className="rounded"
              />
              交换轮函数数据
            </label>
          </div>
        </>
      )}

      {type.includes('des') && (
        <div>
          <label className={labelClass}>S-Box</label>
          <MiniSelect
            value={params.sbox_name || 'Standard DES'}
            onChange={(value) => update('sbox_name', value)}
            options={sboxOptions}
          />
        </div>
      )}
    </>
  );
}
