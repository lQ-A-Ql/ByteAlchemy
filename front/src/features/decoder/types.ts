import type { OperationType } from './components/EncodingTypesList';


export interface EncodingOperation {
  id: string;
  type: OperationType;
  params: Record<string, any>;
  enabled: boolean;
}


export interface StoredEncodingOperation {
  type: OperationType;
  params: Record<string, any>;
  enabled: boolean;
}


export interface DecoderInputPreprocess {
  stripHexPrefix: boolean;
  stripHexEscape: boolean;
  removeSeparators: boolean;
  autoPadOdd: boolean;
}


export interface DecoderInputSlice {
  enabled: boolean;
  offset: string;
  length: string;
}


export interface DecoderRecipe {
  id: string;
  name: string;
  description: string;
  chain: StoredEncodingOperation[];
  inputFormat: string;
  outputFormat: string;
  inputPreprocess: DecoderInputPreprocess;
  inputSlice: DecoderInputSlice;
  createdAt: string;
  updatedAt: string;
}


export interface DecoderRunHistoryItem {
  id: string;
  label: string;
  chain: StoredEncodingOperation[];
  input: string;
  inputFormat: string;
  outputFormat: string;
  outputPreview: string;
  createdAt: string;
  operationCount: number;
}


function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}


function createOperationId(type: OperationType) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}


export function createEncodingOperation(
  type: OperationType,
  params: Record<string, any> = {},
  enabled = true,
): EncodingOperation {
  return {
    id: createOperationId(type),
    type,
    params: cloneValue(params),
    enabled,
  };
}


export function toStoredEncodingOperation(operation: EncodingOperation): StoredEncodingOperation {
  return {
    type: operation.type,
    params: cloneValue(operation.params ?? {}),
    enabled: operation.enabled,
  };
}


export function hydrateEncodingOperation(operation: StoredEncodingOperation): EncodingOperation {
  return createEncodingOperation(operation.type, operation.params, operation.enabled);
}
