import { AnimatePresence, motion } from 'motion/react';
import { Binary, Code2, Fingerprint, Hash, Key, Link, Lock, Search, Shield, ShieldCheck, Type } from 'lucide-react';
import { useState } from 'react';


export type OperationType =
  | 'base64_encode' | 'base64_decode'
  | 'base32_encode' | 'base32_decode'
  | 'base16_encode' | 'base16_decode'
  | 'base85_encode' | 'base85_decode'
  | 'url_encode' | 'url_decode'
  | 'html_encode' | 'html_decode'
  | 'unicode_encode' | 'unicode_decode'
  | 'md5_hash' | 'sha1_hash' | 'sha256_hash' | 'sha512_hash'
  | 'xor_bytes' | 'known_plaintext_helper'
  | 'rc4_encrypt' | 'rc4_decrypt'
  | 'chacha20_encrypt' | 'chacha20_decrypt'
  | 'salsa20_encrypt' | 'salsa20_decrypt'
  | 'blowfish_encrypt' | 'blowfish_decrypt'
  | 'cast_encrypt' | 'cast_decrypt'
  | 'arc2_encrypt' | 'arc2_decrypt'
  | 'des_encrypt' | 'des_decrypt'
  | 'triple_des_encrypt' | 'triple_des_decrypt'
  | 'aes_encrypt' | 'aes_decrypt'
  | 'sm4_encrypt' | 'sm4_decrypt';


export interface EncodingTypeDefinition {
  id: OperationType;
  label: string;
  icon: any;
  color?: string;
  defaultParams?: Record<string, any>;
}


interface EncodingTypesListProps {
  onAddToChain: (type: OperationType, defaultParams?: Record<string, any>) => void;
}


const categories = [
  {
    name: '常见编码',
    color: 'from-pink-500 to-rose-500',
    items: [
      { id: 'base64_encode', label: 'Base64 编码', icon: Binary },
      { id: 'base64_decode', label: 'Base64 解码', icon: Binary },
      { id: 'base32_encode', label: 'Base32 编码', icon: Binary },
      { id: 'base32_decode', label: 'Base32 解码', icon: Binary },
      { id: 'base16_encode', label: 'Base16 编码', icon: Hash },
      { id: 'base16_decode', label: 'Base16 解码', icon: Hash },
      { id: 'base85_encode', label: 'Base85 编码', icon: Binary },
      { id: 'base85_decode', label: 'Base85 解码', icon: Binary },
    ] as EncodingTypeDefinition[],
  },
  {
    name: '网络编码',
    color: 'from-rose-500 to-fuchsia-500',
    items: [
      { id: 'url_encode', label: 'URL 编码', icon: Link },
      { id: 'url_decode', label: 'URL 解码', icon: Link },
      { id: 'html_encode', label: 'HTML 编码', icon: Code2 },
      { id: 'html_decode', label: 'HTML 解码', icon: Code2 },
    ] as EncodingTypeDefinition[],
  },
  {
    name: '文本 / Unicode',
    color: 'from-pink-500 to-fuchsia-500',
    items: [
      { id: 'unicode_encode', label: 'Unicode 编码', icon: Type },
      { id: 'unicode_decode', label: 'Unicode 解码', icon: Type },
    ] as EncodingTypeDefinition[],
  },
  {
    name: '哈希 / 摘要',
    color: 'from-amber-500 to-orange-500',
    items: [
      { id: 'md5_hash', label: 'MD5 哈希', icon: Fingerprint, defaultParams: { output_format: 'hex', salt_position: 'suffix' } },
      { id: 'sha1_hash', label: 'SHA1 哈希', icon: Fingerprint, defaultParams: { output_format: 'hex', salt_position: 'suffix' } },
      { id: 'sha256_hash', label: 'SHA256 哈希', icon: Fingerprint, defaultParams: { output_format: 'hex', salt_position: 'suffix' } },
      { id: 'sha512_hash', label: 'SHA512 哈希', icon: Fingerprint, defaultParams: { output_format: 'hex', salt_position: 'suffix' } },
    ] as EncodingTypeDefinition[],
  },
  {
    name: '魔改 / 分析',
    color: 'from-sky-500 to-cyan-500',
    items: [
      { id: 'xor_bytes', label: 'XOR（重复密钥）', icon: Key, defaultParams: { key: '', key_type: 'hex', data_type: 'hex', output_format: 'hex' } },
      { id: 'known_plaintext_helper', label: '已知明文助手', icon: Key, defaultParams: { preset: 'custom', plain_hex: '', repeat_len: '', use_repeat: true } },
    ] as EncodingTypeDefinition[],
  },
  {
    name: '流加密',
    color: 'from-purple-500 to-violet-500',
    items: [
      { id: 'rc4_encrypt', label: 'RC4 加密', icon: Key, defaultParams: { key: 'secret', key_type: 'utf-8', swap_bytes: false, sbox_name: 'Standard RC4' } },
      { id: 'rc4_decrypt', label: 'RC4 解密', icon: Key, defaultParams: { key: 'secret', key_type: 'utf-8', swap_bytes: false, sbox_name: 'Standard RC4' } },
      { id: 'chacha20_encrypt', label: 'ChaCha20 加密', icon: Key, defaultParams: { key: 'secret', nonce: '', key_type: 'utf-8', nonce_type: 'utf-8' } },
      { id: 'chacha20_decrypt', label: 'ChaCha20 解密', icon: Key, defaultParams: { key: 'secret', nonce: '', key_type: 'utf-8', nonce_type: 'utf-8' } },
      { id: 'salsa20_encrypt', label: 'Salsa20 加密', icon: Key, defaultParams: { key: 'secret', nonce: '', key_type: 'utf-8', nonce_type: 'utf-8' } },
      { id: 'salsa20_decrypt', label: 'Salsa20 解密', icon: Key, defaultParams: { key: 'secret', nonce: '', key_type: 'utf-8', nonce_type: 'utf-8' } },
    ] as EncodingTypeDefinition[],
  },
  {
    name: '分组加密',
    color: 'from-indigo-500 to-purple-500',
    items: [
      { id: 'des_encrypt', label: 'DES 加密', icon: Shield, defaultParams: { key: '12345678', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8', sbox_name: 'Standard DES' } },
      { id: 'des_decrypt', label: 'DES 解密', icon: Shield, defaultParams: { key: '12345678', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8', sbox_name: 'Standard DES' } },
      { id: 'triple_des_encrypt', label: '3DES 加密', icon: ShieldCheck, defaultParams: { key: '123456781234567812345678', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8', sbox_name: 'Standard DES' } },
      { id: 'triple_des_decrypt', label: '3DES 解密', icon: ShieldCheck, defaultParams: { key: '123456781234567812345678', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8', sbox_name: 'Standard DES' } },
      { id: 'blowfish_encrypt', label: 'Blowfish 加密', icon: Shield, defaultParams: { key: 'secret', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8' } },
      { id: 'blowfish_decrypt', label: 'Blowfish 解密', icon: Shield, defaultParams: { key: 'secret', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8' } },
      { id: 'cast_encrypt', label: 'CAST5 加密', icon: Shield, defaultParams: { key: 'secret', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8' } },
      { id: 'cast_decrypt', label: 'CAST5 解密', icon: Shield, defaultParams: { key: 'secret', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8' } },
      { id: 'arc2_encrypt', label: 'RC2/ARC2 加密', icon: Shield, defaultParams: { key: 'secret', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8' } },
      { id: 'arc2_decrypt', label: 'RC2/ARC2 解密', icon: Shield, defaultParams: { key: 'secret', mode: 'ECB', padding: 'pkcs7', key_type: 'utf-8', iv_type: 'utf-8' } },
      { id: 'aes_encrypt', label: 'AES 加密', icon: Lock, defaultParams: { key: '1234567890123456', iv: '', mode: 'CBC', padding: 'pkcs7', sbox_name: 'Standard AES', key_type: 'utf-8', iv_type: 'utf-8', swap_key_schedule: false, swap_data_round: false } },
      { id: 'aes_decrypt', label: 'AES 解密', icon: Lock, defaultParams: { key: '1234567890123456', iv: '', mode: 'CBC', padding: 'pkcs7', sbox_name: 'Standard AES', key_type: 'utf-8', iv_type: 'utf-8', swap_key_schedule: false, swap_data_round: false } },
      { id: 'sm4_encrypt', label: 'SM4 加密', icon: Lock, defaultParams: { key: '1234567890123456', iv: '', mode: 'ECB', padding: 'pkcs7', sbox_name: 'Standard SM4', key_type: 'utf-8', iv_type: 'utf-8', swap_key_schedule: false, swap_data_round: false } },
      { id: 'sm4_decrypt', label: 'SM4 解密', icon: Lock, defaultParams: { key: '1234567890123456', iv: '', mode: 'ECB', padding: 'pkcs7', sbox_name: 'Standard SM4', key_type: 'utf-8', iv_type: 'utf-8', swap_key_schedule: false, swap_data_round: false } },
    ] as EncodingTypeDefinition[],
  },
];


export const operationDefaults: Record<OperationType, Record<string, any> | undefined> = categories
  .flatMap((category) => category.items)
  .reduce((acc, item) => {
    acc[item.id] = item.defaultParams;
    return acc;
  }, {} as Record<OperationType, Record<string, any> | undefined>);


export function EncodingTypesList({ onAddToChain }: EncodingTypesListProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('常见编码');
  const [keyword, setKeyword] = useState('');

  const normalizedKeyword = keyword.trim().toLowerCase();
  const visibleCategories = categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        const label = item.label.toLowerCase();
        const id = item.id.toLowerCase();
        return label.includes(normalizedKeyword) || id.includes(normalizedKeyword);
      }),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-pink-100 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex-shrink-0 space-y-3">
        <div className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-pink-500 to-rose-500" />
          操作列表
          <span className="ml-auto text-xs font-normal text-slate-400">
            {visibleCategories.reduce((count, category) => count + category.items.length, 0)} 项
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-300" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索算法、编码类型或操作名…"
            className="w-full rounded-2xl border border-pink-200 bg-white/80 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition-all focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
          />
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {visibleCategories.length === 0 && (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-pink-200 bg-white/40 p-6 text-center text-sm text-slate-400">
            没有找到匹配的操作，请尝试输入算法名、编码名或英文关键字。
          </div>
        )}

        {visibleCategories.map((category) => {
          const shouldExpand = normalizedKeyword ? true : expandedCategory === category.name;

          return (
            <div key={category.name} className="overflow-hidden rounded-xl">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                className={`flex w-full items-center justify-between rounded-xl bg-gradient-to-r ${category.color} px-3 py-2.5 text-left text-xs font-semibold text-white transition-all duration-300 hover:shadow-lg`}
              >
                {category.name}
                <span className="text-white/70">{category.items.length}</span>
              </button>

              <AnimatePresence>
                {shouldExpand && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 py-2">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => onAddToChain(item.id, item.defaultParams)}
                            className="group w-full rounded-xl bg-white/60 px-3 py-2 text-left ring-1 ring-pink-100 transition-all duration-200 hover:scale-[1.02] hover:bg-white/80 hover:shadow-md hover:ring-2 hover:ring-pink-300"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${category.color} shadow-sm transition-transform duration-200 group-hover:scale-110`}>
                                <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                              </div>
                              <span className="truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-pink-600">
                                {item.label}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
