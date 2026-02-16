import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    height?: string;
    wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
}

export function CodeEditor({ value, onChange, readOnly = false, height = '600px', wordWrap = 'on' }: CodeEditorProps) {
    return (
        <div className="rounded-2xl overflow-hidden border border-cyan-200/70 bg-gradient-to-br from-white via-cyan-50/40 to-white shadow-lg ring-1 ring-cyan-100 h-full">
            <Editor
                height={height}
                defaultLanguage="python"
                value={value}
                onChange={(val) => onChange(val || '')}
                theme="vs-light"
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: wordWrap,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    folding: true,
                    bracketPairColorization: { enabled: true },
                    formatOnPaste: true,
                    formatOnType: true,
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    padding: { top: 12, bottom: 12 },
                }}
            />
        </div>
    );
}
