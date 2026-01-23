import os
import sys
import subprocess
import time
import psutil

def kill_process_on_port(port):
    """如果端口被占用，尝试杀掉占用端口的进程"""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            for conn in proc.net_connections(kind='inet'):
                if conn.laddr.port == port:
                    print(f"Port {port} is in use by {proc.info['name']} (PID: {proc.info['pid']}). Killing...")
                    proc.kill()
                    return
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

def run():
    # 0. Pre-start cleanup
    print("检查端口...")
    kill_process_on_port(3335)  # Backend
    kill_process_on_port(3336)  # Terminal
    
    # 1. Start Backend
    print("启动后端服务...")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = os.path.join(base_dir, ".venv", "bin", "python")

    if not os.path.exists(python_exe):
        python_exe = sys.executable

    backend_script = os.path.join(base_dir, "backend", "server.py")
    backend_proc = subprocess.Popen([python_exe, backend_script])

    # 1.5. Start Terminal WebSocket Server
    print("启动终端服务...")
    terminal_script = os.path.join(base_dir, "core", "script", "terminal_server.py")
    terminal_proc = subprocess.Popen([python_exe, terminal_script])

    # 2. Wait for servers to start
    time.sleep(2)

    npm_cmd = "npm"
    front_dir = os.path.join(base_dir, "front")
    
    # 3. Build Frontend
    print("=" * 40)
    print(">>> ByteAlchemy <<<")
    print("=" * 40)
    print("构建前端...")
    
    build_proc = subprocess.run([npm_cmd, "run", "build"], cwd=front_dir)
    if build_proc.returncode != 0:
        print("前端构建失败!")
        backend_proc.terminate()
        terminal_proc.terminate()
        return
    
    # 4. Start Electron
    print("启动应用...")
    env = os.environ.copy()
    env["SKIP_ELECTRON_BACKEND"] = "1"  # run.py already started backend
    frontend_proc = subprocess.Popen([npm_cmd, "run", "start"], cwd=base_dir, env=env)
    
    try:
        # Monitor processes
        while True:
            if backend_proc.poll() is not None:
                print("后端异常退出。")
                break
            if terminal_proc.poll() is not None:
                print("终端服务异常退出。")
                break
            if frontend_proc.poll() is not None:
                # Frontend closed, normal exit
                break
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n正在停止...")
    finally:
        # Cleanup
        print("清理进程...")
        
        if 'backend_proc' in locals() and backend_proc.poll() is None:
            backend_proc.terminate()
            
        if 'terminal_proc' in locals() and terminal_proc.poll() is None:
            terminal_proc.terminate()
            
        if 'frontend_proc' in locals() and frontend_proc.poll() is None:
            frontend_proc.terminate()
            
        # Ensure deep cleanup if they don't die
        time.sleep(1)
        kill_process_on_port(3335)
        kill_process_on_port(3336)

if __name__ == "__main__":
    run()
