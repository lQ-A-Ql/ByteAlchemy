import { Binary, Lock, Hash, Link, Code2, Type, Shield, ShieldCheck, Key, Fingerprint } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
      { id: 'xor_bytes', label: 'XOR (重复密钥)', icon: Key, defaultParams: { key: '', key_type: 'hex', data_type: 'hex', output_format: 'hex' } },
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

  return (
    <div className="h-full bg-white/50 backdrop-blur-md rounded-3xl p-5 ring-1 ring-pink-200 flex flex-col">
      <h2 className="text-base mb-3 text-gray-700 flex items-center gap-2 flex-shrink-0">
        <div className="w-1 h-5 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></div>
        操作列表
      </h2>

      <div className="flex-1 overflow-y-auto space-y-2">
        {categories.map((category) => (
          <div key={category.name} className="rounded-xl overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
              className={`w-full text-left px-3 py-2.5 text-xs font-semibold text-white bg-gradient-to-r ${category.color} flex items-center justify-between rounded-xl transition-all duration-300 hover:shadow-lg`}
            >
              {category.name}
              <span className="text-white/70">{category.items.length}</span>
            </button>

            {/* Category Items */}
            <AnimatePresence>
              {expandedCategory === category.name && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="py-2 space-y-1">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onAddToChain(item.id, item.defaultParams)}
                          className="group w-full text-left bg-white/60 rounded-xl px-3 py-2 ring-1 ring-pink-100 hover:ring-2 hover:ring-pink-300 transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:bg-white/80"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200 shadow-sm`}>
                              <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-pink-600 transition-colors truncate">
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
        ))}
      </div>
    </div>
  );
}
