import { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal as TerminalIcon, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

const WS_URL = 'ws://127.0.0.1:3336';

// Light theme
const lightTheme = {
    background: '#ffffff',
    foreground: '#2c3e50',
    cursor: '#2c3e50',
    cursorAccent: '#ffffff',
    selection: 'rgba(44, 62, 80, 0.2)',
    black: '#000000',
    red: '#e74c3c',
    green: '#27ae60',
    yellow: '#f1c40f',
    blue: '#2980b9',
    magenta: '#8e44ad',
    cyan: '#16a085',
    white: '#ecf0f1',
};

export function XTermTerminal() {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalInstance = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const websocket = useRef<WebSocket | null>(null);
    const isConnecting = useRef(false);
    const initialized = useRef(false);
    const [isConnected, setIsConnected] = useState(false);

    const connectWebSocket = useCallback(() => {
        if (!terminalInstance.current || isConnecting.current) return;
        if (websocket.current?.readyState === WebSocket.OPEN) return;

        isConnecting.current = true;
        const term = terminalInstance.current;

        try {
            const ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                isConnecting.current = false;
                setIsConnected(true);
                websocket.current = ws;
                ws.send(`INIT:${term.rows}:${term.cols}`);
                term.write('\x1b[1;32m[终端已连接]\x1b[0m\r\n$ ');
            };

            ws.onmessage = (e) => term.write(e.data);

            ws.onclose = () => {
                isConnecting.current = false;
                setIsConnected(false);
                websocket.current = null;
            };

            ws.onerror = () => {
                isConnecting.current = false;
                setIsConnected(false);
            };
        } catch (e) {
            isConnecting.current = false;
        }
    }, []);

    const reconnect = useCallback(() => {
        if (websocket.current) {
            try { websocket.current.close(); } catch { }
            websocket.current = null;
        }
        setIsConnected(false);
        isConnecting.current = false;
        setTimeout(connectWebSocket, 300);
    }, [connectWebSocket]);

    const clearTerminal = useCallback(() => {
        terminalInstance.current?.clear();
    }, []);

    const sendCommand = useCallback((cmd: string) => {
        if (websocket.current?.readyState === WebSocket.OPEN) {
            websocket.current.send(`CMD:${cmd}`);
        }
    }, []);

    const sendInput = useCallback((data: string) => {
        if (websocket.current?.readyState === WebSocket.OPEN) {
            websocket.current.send(data);
        }
    }, []);

    useEffect(() => {
        (window as any).__xtermSendCommand = sendCommand;
        (window as any).__xtermSendInput = sendInput;
        return () => {
            delete (window as any).__xtermSendCommand;
            delete (window as any).__xtermSendInput;
        };
    }, [sendCommand, sendInput]);

    // Initialize terminal
    useEffect(() => {
        if (!terminalRef.current || initialized.current) return;
        initialized.current = true;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
            theme: lightTheme,
            allowTransparency: false, // Disable transparency for better rendering
            scrollback: 1000,
            convertEol: true,
        });

        const fit = new FitAddon();
        fitAddon.current = fit;
        term.loadAddon(fit);
        term.loadAddon(new WebLinksAddon());

        term.open(terminalRef.current);
        terminalInstance.current = term;

        // Fit after container is sized
        const doFit = () => {
            if (terminalRef.current && terminalRef.current.offsetHeight > 0) {
                fit.fit();
                connectWebSocket();
            } else {
                // Retry if not sized yet
                setTimeout(doFit, 100);
            }
        };
        setTimeout(doFit, 50);

        term.onData((data) => {
            if (websocket.current?.readyState === WebSocket.OPEN) {
                websocket.current.send(data);
            }
        });

        const handleResize = () => {
            fit.fit();
            if (websocket.current?.readyState === WebSocket.OPEN && term.rows && term.cols) {
                websocket.current.send(`RESIZE:${term.rows}:${term.cols}`);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (websocket.current) {
                try { websocket.current.close(); } catch { }
            }
            term.dispose();
            initialized.current = false;
        };
    }, [connectWebSocket]);

    return (
        <div ref={containerRef} className="h-full flex flex-col rounded-2xl overflow-hidden ring-1 ring-cyan-200 bg-white">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <TerminalIcon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-white font-medium text-sm">交互式终端</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isConnected ? 'bg-green-500/30 text-white' : 'bg-red-500/30 text-white'
                        }`}>
                        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {isConnected ? '已连接' : '未连接'}
                    </div>
                    <button onClick={reconnect} className="p-1 rounded hover:bg-white/20 text-white" title="重连">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={clearTerminal} className="p-1 rounded hover:bg-white/20 text-white" title="清屏">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1 ml-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                </div>
            </div>

            {/* Terminal Content - use explicit height calculation */}
            <div
                ref={terminalRef}
                className="flex-1 bg-white p-2"
                style={{ minHeight: '612px' }}
            />
        </div>
    );
}

export function runTerminalCommand(cmd: string) {
    const fn = (window as any).__xtermSendCommand;
    if (fn) fn(cmd);
}

export function runTerminalInput(data: string) {
    const fn = (window as any).__xtermSendInput;
    if (fn) fn(data);
}
