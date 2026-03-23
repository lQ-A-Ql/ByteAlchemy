/**
 * API 服务层 - 封装所有后端 API 调用
 */

const DEFAULT_API_BASE = 'http://127.0.0.1:3335';

export function getApiBase(): string {
  const envBase = import.meta.env.VITE_API_BASE?.trim();
  return envBase || DEFAULT_API_BASE;
}

export function getTerminalWebSocketUrl(): string {
  const envWs = import.meta.env.VITE_TERMINAL_WS_URL?.trim();
  if (envWs) {
    return envWs;
  }

  try {
    const apiUrl = new URL(getApiBase());
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    apiUrl.pathname = '/ws/terminal';
    apiUrl.search = '';
    apiUrl.hash = '';
    return apiUrl.toString();
  } catch {
    return 'ws://127.0.0.1:3335/ws/terminal';
  }
}

// Pipeline operation 类型
export interface PipelineOperation {
  name: string;
  params?: Record<string, any>;
}

// 通用 API 调用
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const config: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${getApiBase()}${endpoint}`, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }
  return response.json();
}

// ==================== Pipeline API ====================
export async function runPipeline(
  data: string,
  operations: PipelineOperation[],
  inputFormat = 'utf-8',
  outputFormat = 'auto'
): Promise<string> {
  const result = await apiRequest<{ result: string }>('/api/pipeline/run', 'POST', {
    data,
    operations,
    input_format: inputFormat,
    output_format: outputFormat,
  });
  return result.result;
}

// ==================== S-Box API ====================
export async function getSBoxNames(): Promise<string[]> {
  const result = await apiRequest<{ names: string[] }>('/api/sbox/names');
  return result.names;
}

export async function getSBox(name: string): Promise<{ name: string; content: string; is_standard: boolean }> {
  const result = await apiRequest<{ name: string; content: string; is_standard: boolean }>(
    `/api/sbox/get/${encodeURIComponent(name)}`
  );
  return result;
}

export async function saveSBox(name: string, content: string): Promise<void> {
  await apiRequest('/api/sbox/save', 'POST', { name, content });
}

export async function deleteSBox(name: string): Promise<void> {
  await apiRequest(`/api/sbox/delete/${encodeURIComponent(name)}`, 'DELETE');
}

// ==================== Format API ====================
export async function formatCode(type: string, data: string, indent = 4): Promise<string> {
  const result = await apiRequest<{ result: string }>('/api/format', 'POST', { type, data, indent });
  return result.result;
}

// ==================== Regex API ====================
export async function escapeRegex(data: string): Promise<string> {
  const result = await apiRequest<{ result: string }>('/api/regex/escape', 'POST', { data });
  return result.result;
}

export async function generateRegex(options: {
  include_digits?: boolean;
  include_lower?: boolean;
  include_upper?: boolean;
  custom_chars?: string;
  exclude_chars?: string;
}): Promise<string> {
  const result = await apiRequest<{ result: string }>('/api/regex/generate', 'POST', options);
  return result.result;
}

// ==================== Utils API ====================
export async function convertFormat(data: string, from_fmt: string, to_fmt: string, separator?: string): Promise<string> {
  const result = await apiRequest<{ result: string }>('/api/utils/convert_format', 'POST', {
    data, from_fmt, to_fmt, separator
  });
  return result.result;
}

// ==================== Scripts API ====================
export interface Script {
  id: string;
  name: string;
  content: string;
  description: string;
  filename?: string;
  relative_path?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getScripts(): Promise<Script[]> {
  const result = await apiRequest<{ scripts: Script[] }>('/api/scripts');
  return result.scripts;
}

export async function getScript(id: string): Promise<Script> {
  const result = await apiRequest<{ script: Script }>(`/api/scripts/${id}`);
  return result.script;
}

export async function createScript(name: string, content: string, description = ''): Promise<Script> {
  const result = await apiRequest<{ script: Script }>('/api/scripts', 'POST', { name, content, description });
  return result.script;
}

export async function updateScript(id: string, data: { name?: string; content?: string; description?: string }): Promise<Script> {
  const result = await apiRequest<{ script: Script }>(`/api/scripts/${id}`, 'PUT', data);
  return result.script;
}

export async function deleteScript(id: string): Promise<void> {
  await apiRequest(`/api/scripts/${id}`, 'DELETE');
}

export async function runScript(id: string): Promise<{ output: string; success: boolean }> {
  return apiRequest(`/api/scripts/${id}/run`, 'POST');
}

// ==================== Key Reconstruction API ====================
export interface BlockParam {
  name: string;
  type: string;
  label: string;
  default?: string;
  options?: string;
}

export interface BlockDefinition {
  name: string;
  category: string;
  params: BlockParam[];
  code: string;
  input?: string;
  output?: string;
  is_container?: boolean;
  imports?: string[];
}

export interface BlocksData {
  categories: Record<string, { name: string; color: string; icon: string }>;
  blocks: Record<string, BlockDefinition>;
  sbox_list: string[];
}

export async function getKeyBlocks(): Promise<BlocksData> {
  return apiRequest('/api/key-blocks');
}

export async function generateKeyCode(
  blocks: Array<{ block_id: string; params: Record<string, any>; children?: any[] }>,
  funcName = 'transform_key',
  args = 'data'
): Promise<string> {
  const result = await apiRequest<{ code: string }>('/api/key-generate', 'POST', {
    blocks,
    func_name: funcName,
    args,
  });
  return result.code;
}


export async function executeKeyCode(code: string, inputHex = ''): Promise<{
  success: boolean;
  result?: string;
  result_bytes?: number[];
  error?: string;
}> {
  return apiRequest('/api/key-execute', 'POST', { code, input_hex: inputHex });
}

export async function parseKeyCode(code: string): Promise<any[]> {
  const result = await apiRequest<{ success: boolean; chain: any[]; error?: string }>('/api/key-parse', 'POST', { code });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.chain;
}

export async function saveCustomBlock(blockId: string, blockDef: BlockDefinition): Promise<boolean> {
  const result = await apiRequest<{ success: boolean }>('/api/key-blocks/custom', 'POST', {
    block_id: blockId,
    block_def: blockDef
  });
  return result.success;
}

export async function deleteCustomBlock(blockId: string): Promise<boolean> {
  const result = await apiRequest<{ success: boolean }>(`/api/key-blocks/custom/${blockId}`, 'DELETE');
  return result.success;
}

// ==================== IDA Analyzer API ====================
export interface IdaAnalyzeResult {
  summary: string;
  matches: Array<{
    name: string;
    confidence: number;
    evidence: string[];
    notes: string[];
  }>;
  notes: string[];
}

export async function analyzeIdaPseudocode(code: string): Promise<IdaAnalyzeResult> {
  return apiRequest('/api/ida/analyze', 'POST', { code });
}

