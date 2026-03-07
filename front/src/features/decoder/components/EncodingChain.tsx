import { useRef, useEffect, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Binary, Lock, X, GripVertical, Settings2, Hash, Link, Code2, Type, Shield, ShieldCheck, Key, Fingerprint, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { OperationType } from './EncodingTypesList';
import { MiniSelect } from '@/shared/components/CustomSelect';

export interface EncodingOperation {
  id: string;
  type: OperationType;
  params: Record<string, any>;
  enabled: boolean;
}

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
  xor_bytes: 'XOR (重复密钥)', known_plaintext_helper: '已知明文助手',
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

// Check if operation needs parameters
const hasParams = (type: OperationType) => {
  return type.includes('aes') || type.includes('sm4') || type.includes('des') ||
    type.includes('rc4') || type.includes('blowfish') || type.includes('cast') ||
    type.includes('arc2') || type.includes('chacha20') || type.includes('salsa20') ||
    type.includes('sha') || type === 'md5_hash' || type === 'xor_bytes' || type === 'known_plaintext_helper';
};

export function EncodingChain({ chain, onRemove, onUpdateParams, onMove, onToggle, onClear, sboxNames, input, inputFormat, inputPreprocess, onUpsertXorKey }: EncodingChainProps) {
  const activeCount = chain.filter((operation) => operation.enabled).length;
  const disabledCount = chain.length - activeCount;

  return (
    <div className="h-full rounded-3xl bg-white/50 p-5 ring-1 ring-purple-200 backdrop-blur-md flex flex-col overflow-hidden">
      <div className="mb-3 flex items-start justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className="flex items-center gap-2 text-base text-gray-700">
            <div className="h-5 w-1 rounded-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
            编码链
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
            className="rounded-xl bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-purple-100 transition-all hover:bg-purple-50 hover:text-purple-700"
          >
            清空
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {chain.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-4">
            <div className="w-full rounded-2xl border-2 border-dashed border-gray-200 p-6 text-sm text-gray-400">
              <div className="mb-2">从左侧选择算子，构建你的操作链。</div>
              <div className="text-xs text-gray-350">支持拖拽排序、折叠参数与按步骤启用 / 停用。</div>
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

function ChainItem({ operation, index, onRemove, onUpdateParams, onMove, onToggle, sboxNames, input, inputFormat, inputPreprocess, onUpsertXorKey }: ChainItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showParams, setShowParams] = useState(false);

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'CHAIN_ITEM',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'CHAIN_ITEM',
    hover: (item: { index: number }) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const Icon = iconMap[operation.type] || Binary;
  const color = colorMap[operation.type] || 'from-gray-500 to-gray-600';
  const label = labelMap[operation.type] || operation.type;
  const showSettings = hasParams(operation.type);

  return (
    <motion.div
      ref={ref}
      className={`bg-white/80 rounded-xl ring-1 ring-purple-100 transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : 'hover:ring-2 hover:ring-purple-300 hover:shadow-md'
        } ${!operation.enabled ? 'opacity-50' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <div className="cursor-move text-gray-400 hover:text-purple-500 transition-colors">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Icon */}
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate">{label}</div>
            <div className="text-xs text-gray-400">步骤 {index + 1}</div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Enable/Disable Switch */}
            <button
              onClick={() => onToggle(operation.id)}
              className={`w-8 h-5 rounded-full transition-colors ${operation.enabled ? 'bg-purple-500' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${operation.enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </button>
            {showSettings && (
              <button
                onClick={() => setShowParams(!showParams)}
                className={`p-1 rounded-lg hover:bg-purple-100 transition-colors ${showParams ? 'text-purple-600 bg-purple-100' : 'text-gray-500'}`}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showParams ? 'rotate-180' : ''}`} />
              </button>
            )}
            <button
              onClick={() => onRemove(operation.id)}
              className="p-1 rounded-lg hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Parameters Panel */}
        <AnimatePresence>
          {showParams && showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-purple-100 space-y-2">
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

function ParamsPanel({ operation, onUpdateParams, sboxNames, input, inputFormat, inputPreprocess, onUpsertXorKey }: ParamsPanelProps) {
  const { type, params, id } = operation;
  const update = (key: string, value: any) => onUpdateParams(id, { ...params, [key]: value });

  const inputClass = "w-full px-2 py-1.5 text-xs bg-white/60 border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400";
  const labelClass = "text-xs text-gray-600 mb-1";

  const typeOptions = [
    { value: 'utf-8', label: 'UTF-8' },
    { value: 'hex', label: 'HEX' },
  ];

  const outputFormatOptions = [
    { value: 'hex', label: 'HEX' },
    { value: 'base64', label: 'Base64' },
  ];

  const saltPositionOptions = [
    { value: 'prefix', label: '前缀' },
    { value: 'suffix', label: '后缀' },
    { value: 'both', label: '前后' },
  ];

  const modeOptions = ['ECB', 'CBC', 'CFB', 'OFB', 'CTR'].map(m => ({ value: m, label: m }));
  const paddingOptions = ['pkcs7', 'zeropadding', 'iso10126', 'ansix923', 'nopadding'].map(p => ({ value: p, label: p }));
  const sboxOptions = sboxNames.map(name => ({ value: name, label: name }));
  const xorOutputOptions = [
    { value: 'hex', label: 'HEX' },
    { value: 'utf-8', label: 'UTF-8' },
  ];

  const magicPresets = [
    { id: 'custom', label: '自定义', hex: '' },
    { id: 'png', label: 'PNG', hex: '89504e470d0a1a0a' },
    { id: 'zip', label: 'ZIP', hex: '504b0304' },
    { id: 'elf', label: 'ELF', hex: '7f454c46' },
    { id: 'pe', label: 'PE', hex: '4d5a' },
    { id: 'jpg', label: 'JPEG', hex: 'ffd8ffe0' },
    { id: 'gzip', label: 'GZIP', hex: '1f8b08' },
    { id: 'pdf', label: 'PDF', hex: '25504446' },
  ];

  const normalizeHex = (value: string) => {
    let result = value;
    if (inputPreprocess.stripHexPrefix) result = result.replace(/0x/gi, '');
    if (inputPreprocess.stripHexEscape) result = result.replace(/\\x/gi, '');
    if (inputPreprocess.removeSeparators) result = result.replace(/[^0-9a-fA-F]/g, '');
    if (inputPreprocess.autoPadOdd && result.length % 2 !== 0) result = `0${result}`;
    return result;
  };

  const hexToBytes = (hex: string) => {
    const clean = hex.replace(/0x/gi, '').replace(/\\x/gi, '').replace(/[^0-9a-fA-F]/g, '');
    if (clean.length % 2 !== 0) return null;
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(parseInt(clean.slice(i, i + 2), 16));
    }
    return bytes;
  };

  const bytesToHex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  const bytesToAscii = (bytes: number[]) => bytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');

  if (type === 'xor_bytes') {
    return (
      <>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Key</label>
            <input type="text" value={params.key || ''} onChange={(e) => update('key', e.target.value)} placeholder="HEX 或 UTF-8" className={inputClass} />
          </div>
          <div className="w-20">
            <label className={labelClass}>类型</label>
            <MiniSelect
              value={params.key_type || 'hex'}
              onChange={(v) => update('key_type', v)}
              options={typeOptions}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>数据类型</label>
            <MiniSelect
              value={params.data_type || 'hex'}
              onChange={(v) => update('data_type', v)}
              options={typeOptions}
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>输出</label>
            <MiniSelect
              value={params.output_format || 'hex'}
              onChange={(v) => update('output_format', v)}
              options={xorOutputOptions}
            />
          </div>
        </div>
        <div className="text-[10px] text-gray-500">用于重复密钥 XOR、字节混淆等场景</div>
      </>
    );
  }

  if (type === 'known_plaintext_helper') {
    const plainHex = params.preset && params.preset !== 'custom'
      ? (magicPresets.find((p) => p.id === params.preset)?.hex || '')
      : (params.plain_hex || '');

    const cipherHex = normalizeHex(input || '');
    const cipherBytes = hexToBytes(cipherHex || '');
    const plainBytes = hexToBytes(plainHex || '');
    let error: string | null = null;
    let keyHex = '';
    let keyRepeatHex = '';
    let bestLen = 0;
    let bestScore = 0;
    let previewHex = '';
    let previewAscii = '';

    if (cipherBytes && plainBytes && cipherBytes.length > 0 && plainBytes.length > 0) {
      if (plainBytes.length > cipherBytes.length) {
        error = '已知明文长度不能超过密文';
      } else {
        const keyBytes = cipherBytes.slice(0, plainBytes.length).map((b, i) => b ^ plainBytes[i]);
        const maxLen = Math.min(32, keyBytes.length);
        let localBestLen = 1;
        let localBestScore = 0;
        for (let len = 1; len <= maxLen; len += 1) {
          let match = 0;
          for (let i = 0; i < keyBytes.length; i += 1) {
            if (keyBytes[i] === keyBytes[i % len]) match += 1;
          }
          const score = match / keyBytes.length;
          if (score > localBestScore + 0.001 || (Math.abs(score - localBestScore) < 0.001 && len < localBestLen)) {
            localBestScore = score;
            localBestLen = len;
          }
        }
        bestLen = localBestLen;
        bestScore = localBestScore;
        const useLen = params.use_repeat === false ? keyBytes.length : (parseInt(params.repeat_len || '', 10) || bestLen);
        const keyRepeat = keyBytes.slice(0, useLen);
        const decryptedBytes = cipherBytes.map((b, i) => b ^ keyRepeat[i % keyRepeat.length]);
        keyHex = bytesToHex(keyBytes);
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
            onChange={(v) => update('preset', v)}
            options={magicPresets.map((p) => ({ value: p.id, label: p.label }))}
          />
        </div>
        <div>
          <label className={labelClass}>自定义明文 HEX</label>
          <input
            type="text"
            value={params.plain_hex || ''}
            onChange={(e) => update('plain_hex', e.target.value)}
            placeholder="仅在自定义时生效"
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={params.use_repeat !== false} onChange={(e) => update('use_repeat', e.target.checked)} className="rounded" />
            重复密钥推断
          </label>
          <input
            type="text"
            value={params.repeat_len || ''}
            onChange={(e) => update('repeat_len', e.target.value)}
            placeholder="长度"
            className="w-20 px-2 py-1.5 text-xs bg-white/60 border border-purple-200 rounded-lg"
          />
          <button
            onClick={() => onUpsertXorKey(keyRepeatHex)}
            disabled={!keyRepeatHex}
            className="ml-auto px-2.5 py-1.5 text-xs rounded-lg bg-sky-500 text-white disabled:opacity-40"
          >
            送入 XOR
          </button>
        </div>
        {inputFormat !== 'HEX' && inputFormat !== 'AUTO' && (
          <div className="text-[10px] text-amber-600">输入格式为 HEX/AUTO 时效果最佳</div>
        )}
        {error && <div className="text-[10px] text-red-600">{error}</div>}
        {!error && keyRepeatHex && (
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500">推断长度: {bestLen} (置信 {Math.round(bestScore * 100)}%)</div>
            <div className="text-[10px] text-gray-500">重复密钥 HEX</div>
            <div className="px-2 py-1 bg-sky-50 rounded text-[11px] font-mono text-sky-700 break-all">{keyRepeatHex}</div>
            <div className="text-[10px] text-gray-500">解密预览</div>
            <div className="px-2 py-1 bg-sky-50 rounded text-[11px] font-mono text-sky-700 break-all">{previewHex}</div>
            <div className="px-2 py-1 bg-white/80 rounded text-[11px] font-mono text-gray-700 break-all">{previewAscii}</div>
          </div>
        )}
      </>
    );
  }

  // MD5
  if (type === 'md5_hash' || type.includes('sha')) {
    return (
      <>
        <div>
          <label className={labelClass}>输出格式</label>
          <MiniSelect
            value={params.output_format || 'hex'}
            onChange={(v) => update('output_format', v)}
            options={outputFormatOptions}
          />
        </div>
        <div>
          <label className={labelClass}>SALT</label>
          <input type="text" value={params.salt || ''} onChange={(e) => update('salt', e.target.value)} placeholder="盐值 (UTF-8)" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>SALT 位置</label>
          <MiniSelect
            value={params.salt_position || 'suffix'}
            onChange={(v) => update('salt_position', v)}
            options={saltPositionOptions}
          />
        </div>
      </>
    );
  }

  // RC4
  if (type.includes('rc4')) {
    return (
      <>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Key</label>
            <input type="text" value={params.key || ''} onChange={(e) => update('key', e.target.value)} placeholder="密钥" className={inputClass} />
          </div>
          <div className="w-20">
            <label className={labelClass}>类型</label>
            <MiniSelect
              value={params.key_type || 'utf-8'}
              onChange={(v) => update('key_type', v)}
              options={typeOptions}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={params.swap_bytes || false} onChange={(e) => update('swap_bytes', e.target.checked)} className="rounded" />
          Swap Bytes (Magic KSA)
        </label>
        <div>
          <label className={labelClass}>S-Box</label>
          <MiniSelect
            value={params.sbox_name || 'Standard RC4'}
            onChange={(v) => update('sbox_name', v)}
            options={sboxOptions}
          />
        </div>
      </>
    );
  }

  // ChaCha20 / Salsa20
  if (type.includes('chacha20') || type.includes('salsa20')) {
    const hint = type.includes('chacha20')
      ? 'Key 32字节, Nonce 8字节 (可用HEX或UTF-8)'
      : 'Key 32字节, Nonce 8字节 (可用HEX或UTF-8)';
    return (
      <>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Key</label>
            <input type="text" value={params.key || ''} onChange={(e) => update('key', e.target.value)} placeholder="密钥" className={inputClass} />
          </div>
          <div className="w-20">
            <label className={labelClass}>类型</label>
            <MiniSelect
              value={params.key_type || 'utf-8'}
              onChange={(v) => update('key_type', v)}
              options={typeOptions}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Nonce</label>
            <input type="text" value={params.nonce || ''} onChange={(e) => update('nonce', e.target.value)} placeholder="可留空自动生成" className={inputClass} />
          </div>
          <div className="w-20">
            <label className={labelClass}>类型</label>
            <MiniSelect
              value={params.nonce_type || 'utf-8'}
              onChange={(v) => update('nonce_type', v)}
              options={typeOptions}
            />
          </div>
        </div>
        <div className="text-[10px] text-gray-500">
          {hint}
        </div>
      </>
    );
  }

  // DES / 3DES / AES / SM4 / Blowfish / CAST / ARC2
  const showIV = params.mode && params.mode !== 'ECB';
  const isSM4OrAES = type.includes('sm4') || type.includes('aes');
  const extraHint = type.includes('blowfish')
    ? 'Blowfish Key: 4-56字节, IV: 8字节'
    : type.includes('cast')
      ? 'CAST5 Key: 5-16字节, IV: 8字节'
      : type.includes('arc2')
        ? 'RC2/ARC2 Key: 5-128字节, IV: 8字节'
        : '';

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>Key</label>
          <input type="text" value={params.key || ''} onChange={(e) => update('key', e.target.value)} placeholder="密钥" className={inputClass} />
        </div>
        <div className="w-20">
          <label className={labelClass}>类型</label>
          <MiniSelect
            value={params.key_type || 'utf-8'}
            onChange={(v) => update('key_type', v)}
            options={typeOptions}
          />
        </div>
      </div>

      {extraHint && (
        <div className="text-[10px] text-gray-500">
          {extraHint}
        </div>
      )}

      {showIV && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>IV</label>
            <input type="text" value={params.iv || ''} onChange={(e) => update('iv', e.target.value)} placeholder="初始向量" className={inputClass} />
          </div>
          <div className="w-20">
            <label className={labelClass}>类型</label>
            <MiniSelect
              value={params.iv_type || 'utf-8'}
              onChange={(v) => update('iv_type', v)}
              options={typeOptions}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>Mode</label>
          <MiniSelect
            value={params.mode || 'ECB'}
            onChange={(v) => update('mode', v)}
            options={modeOptions}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Padding</label>
          <MiniSelect
            value={params.padding || 'pkcs7'}
            onChange={(v) => update('padding', v)}
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
              onChange={(v) => update('sbox_name', v)}
              options={sboxOptions}
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={params.swap_key_schedule || false} onChange={(e) => update('swap_key_schedule', e.target.checked)} className="rounded" />
              Swap Key Schedule
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={params.swap_data_round || false} onChange={(e) => update('swap_data_round', e.target.checked)} className="rounded" />
              Swap Data Round
            </label>
          </div>
        </>
      )}

      {/* DES/3DES Custom S-Box */}
      {(type.includes('des')) && (
        <div>
          <label className={labelClass}>S-Box</label>
          <MiniSelect
            value={params.sbox_name || 'Standard DES'}
            onChange={(v) => update('sbox_name', v)}
            options={sboxOptions}
          />
        </div>
      )}
    </>
  );
}