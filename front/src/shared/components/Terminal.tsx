import { useState } from 'react';
import { Terminal as TerminalIcon, Send } from 'lucide-react';

export function Terminal() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ command: string; output: string }[]>([
    { command: 'echo "Welcome to Terminal"', output: 'Welcome to Terminal' },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Placeholder - 实际实现需要连接到系统bash
    const output = `[占位] 命令执行: ${input}\n等待后端bash连接...`;
    
    setHistory([...history, { command: input, output }]);
    setInput('');
  };

  return (
    <div className="h-full bg-white rounded-3xl ring-1 ring-cyan-200 shadow-lg flex flex-col overflow-hidden">
      {/* Terminal Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <TerminalIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-white font-medium">Terminal</h3>
            <p className="text-xs text-cyan-100">Bash Shell</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 p-6 overflow-y-auto font-mono text-sm space-y-3">
        {history.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-cyan-600">$</span>
              <span className="text-gray-800">{item.command}</span>
            </div>
            <div className="text-gray-600 whitespace-pre-wrap pl-4">
              {item.output}
            </div>
          </div>
        ))}
      </div>

      {/* Terminal Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-cyan-600 font-mono">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入命令..."
            className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-gray-800 placeholder-gray-400"
          />
          <button
            type="submit"
            className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
