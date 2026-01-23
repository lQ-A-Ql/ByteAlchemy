"""
Terminal Server - WebSocket PTY Terminal
提供完整的交互式终端功能 (Linux/macOS)
"""

import asyncio
import os
import sys
import signal
import struct
import pty
import fcntl
import termios
import select
import websockets
from websockets.exceptions import ConnectionClosed


class TerminalSession:
    """Unix 终端会话 (Linux/macOS)"""
    
    def __init__(self, shell: str = "/bin/bash"):
        self.shell = shell
        self.fd = None
        self.pid = None
        self.running = False
    
    def start(self, rows: int = 24, cols: int = 80):
        """启动PTY会话"""
        self.stop()
        
        self.pid, self.fd = pty.fork()
        
        if self.pid == 0:
            # 子进程 - 执行shell
            os.environ['TERM'] = 'xterm-256color'
            os.environ['COLORTERM'] = 'truecolor'
            os.execvp(self.shell, [self.shell])
        else:
            # 父进程
            self.running = True
            self.resize(rows, cols)
    
    def resize(self, rows: int, cols: int):
        """调整终端大小"""
        if self.fd:
            try:
                winsize = struct.pack('HHHH', rows, cols, 0, 0)
                fcntl.ioctl(self.fd, termios.TIOCSWINSZ, winsize)
            except Exception:
                pass
    
    def write(self, data: str):
        """向终端写入数据"""
        if self.fd and self.running:
            try:
                os.write(self.fd, data.encode('utf-8'))
            except OSError:
                self.running = False
    
    def read(self, timeout: float = 0.1) -> str:
        """读取终端输出"""
        if not self.fd or not self.running:
            return ""
        
        try:
            readable, _, _ = select.select([self.fd], [], [], timeout)
            if readable:
                data = os.read(self.fd, 4096)
                if not data:
                    self.running = False
                    return ""
                return data.decode('utf-8', errors='replace')
        except OSError:
            self.running = False
        return ""
    
    def stop(self):
        """停止终端会话"""
        self.running = False
        if self.pid and self.pid > 0:
            try:
                os.kill(self.pid, signal.SIGTERM)
                os.waitpid(self.pid, os.WNOHANG)
            except (ProcessLookupError, ChildProcessError, OSError):
                pass
            self.pid = None
        if self.fd:
            try:
                os.close(self.fd)
            except OSError:
                pass
            self.fd = None


class TerminalServer:
    """WebSocket终端服务器"""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 3336):
        self.host = host
        self.port = port
        self.sessions = {}
    
    async def handle_client(self, websocket):
        """处理WebSocket连接"""
        session = TerminalSession()
        session_id = id(websocket)
        self.sessions[session_id] = session
        read_task = None
        
        try:
            # 等待初始化消息 (包含终端尺寸)
            try:
                init_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            except asyncio.TimeoutError:
                init_msg = ""
            
            if init_msg.startswith("INIT:"):
                parts = init_msg.split(":")
                rows = int(parts[1]) if len(parts) > 1 else 24
                cols = int(parts[2]) if len(parts) > 2 else 80
                session.start(rows, cols)
            else:
                session.start()
            
            # 检查会话是否成功启动
            if not session.running:
                await websocket.send("\033[1;31m[Error] Failed to start terminal session\033[0m\r\n")
                return
            
            # 发送欢迎消息
            await websocket.send("\033[1;32m[Terminal Ready - Unix]\033[0m\r\n")
            
            # 启动读取任务
            read_task = asyncio.create_task(self._read_loop(websocket, session))
            
            # 处理输入
            async for message in websocket:
                if not session.running:
                    break
                if message.startswith("RESIZE:"):
                    # 处理resize消息
                    parts = message.split(":")
                    rows = int(parts[1]) if len(parts) > 1 else 24
                    cols = int(parts[2]) if len(parts) > 2 else 80
                    session.resize(rows, cols)
                elif message.startswith("CMD:"):
                    # 执行脚本命令 (快捷方式)
                    cmd = message[4:]
                    session.write(cmd + "\r\n")
                else:
                    # 普通输入
                    session.write(message)
            
        except ConnectionClosed:
            pass
        except Exception as e:
            print(f"Session error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # 清理
            if read_task:
                read_task.cancel()
                try:
                    await read_task
                except asyncio.CancelledError:
                    pass
            session.stop()
            if session_id in self.sessions:
                del self.sessions[session_id]
    
    async def _read_loop(self, websocket, session):
        """持续读取终端输出并发送"""
        try:
            while session.running:
                output = await asyncio.get_event_loop().run_in_executor(
                    None, session.read, 0.05
                )
                if output:
                    try:
                        await websocket.send(output)
                    except ConnectionClosed:
                        break
                await asyncio.sleep(0.02)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Read loop error: {e}")
    
    async def start(self):
        """启动WebSocket服务器"""
        print(f"Terminal WebSocket server starting on ws://{self.host}:{self.port}")
        print("Platform: Unix")
        async with websockets.serve(
            self.handle_client, 
            self.host, 
            self.port,
            ping_interval=20,
            ping_timeout=60
        ):
            await asyncio.Future()  # 永远运行


def run_terminal_server():
    """运行终端服务器"""
    server = TerminalServer()
    asyncio.run(server.start())


if __name__ == "__main__":
    run_terminal_server()
