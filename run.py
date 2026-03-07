import os
import sys
import subprocess
import time
import psutil

def kill_process_on_port(port):
    """如果端口被占用，尝试杀掉占用端口的进程"""
    try:
        connections = psutil.net_connections(kind='inet')
    except Exception:
        connections = []

    for conn in connections:
        if not conn.laddr or conn.laddr.port != port or not conn.pid:
            continue
        try:
            proc = psutil.Process(conn.pid)
            print(f"Port {port} is in use by {proc.name()} (PID: {conn.pid}). Killing...")
            proc.kill()
            return
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

def run():
    # 0. Pre-start cleanup
    print("检查端口...")
    kill_process_on_port(3335)  # Kill existing backend process
    
    # 1. Start Backend
    print("启动后端服务...")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    if os.name == "nt":
        venv_python = os.path.join(base_dir, ".venv", "Scripts", "python.exe")
    else:
        venv_python = os.path.join(base_dir, ".venv", "bin", "python")

    python_exe = venv_python if os.path.exists(venv_python) else sys.executable

    backend_script = os.path.join(base_dir, "backend", "server.py")
    backend_proc = subprocess.Popen([python_exe, backend_script])

    # 2. Wait for servers to start
    time.sleep(2)

    # This project uses pnpm, define the command for it
    pnpm_cmd = "pnpm.cmd" if os.name == "nt" else "pnpm"
    front_dir = os.path.join(base_dir, "front")
    node_modules_dir = os.path.join(front_dir, "node_modules")
    
    # 3. Build Frontend
    print("=" * 40)
    print(">>> ByteAlchemy <<<")
    print("=" * 40)
    print("构建前端...")

    if not os.path.isdir(node_modules_dir):
        print("检测到前端依赖未安装，正在执行 pnpm install...")
        install_proc = subprocess.run([pnpm_cmd, "install"], cwd=front_dir)
        if install_proc.returncode != 0:
            print("前端依赖安装失败!")
            backend_proc.terminate()
            return
    
    build_proc = subprocess.run([pnpm_cmd, "run", "build"], cwd=front_dir)
    if build_proc.returncode != 0:
        print("前端构建失败!")
        backend_proc.terminate()
        return
    
    # 4. Start Electron
    print("启动应用...")
    env = os.environ.copy()
    env["SKIP_ELECTRON_BACKEND"] = "1"  # run.py already started backend
    frontend_proc = subprocess.Popen([pnpm_cmd, "run", "start"], cwd=base_dir, env=env)
    
    try:
        # Monitor processes
        while True:
            if backend_proc.poll() is not None:
                print("后端异常退出。")
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
            
        if 'frontend_proc' in locals() and frontend_proc.poll() is None:
            frontend_proc.terminate()
            
        # Ensure deep cleanup if they don't die
        time.sleep(1)
        kill_process_on_port(3335)

if __name__ == "__main__":
    run()
