"""
Script Manager - 用户脚本库管理模块

功能:
- 脚本CRUD操作 (创建、读取、更新、删除)
- 脚本元数据管理
- 脚本执行与输出流式返回
"""

import os
import json
import uuid
import sys
import shutil
import subprocess
import threading
from datetime import datetime
from typing import List, Dict, Optional, Generator
from pathlib import Path


class ScriptManager:
    """管理用户上传的Python脚本"""
    
    def __init__(self, scripts_dir: Optional[str] = None):
        self.project_root = Path(__file__).resolve().parents[2]
        self.legacy_scripts_dir = Path(__file__).parent / "user_scripts"

        # 默认脚本存储目录
        if scripts_dir is None:
            self.scripts_dir = self.project_root / "scripts"
        else:
            self.scripts_dir = Path(scripts_dir).resolve()
        
        self.metadata_file = self.scripts_dir / "metadata.json"
        self._ensure_dirs()
        self._migrate_legacy_scripts()
        self._load_metadata()
    
    def _ensure_dirs(self):
        """确保必要目录存在"""
        self.scripts_dir.mkdir(parents=True, exist_ok=True)

        if not self.metadata_file.exists():
            self.metadata_file.write_text("{}", encoding='utf-8')

    def _load_metadata_file(self, metadata_file: Path) -> Dict:
        """从指定元数据文件加载数据"""
        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _relative_script_path(self, filename: str) -> str:
        """获取相对于项目根目录的脚本路径"""
        script_path = self.scripts_dir / filename
        try:
            return script_path.relative_to(self.project_root).as_posix()
        except ValueError:
            return os.path.relpath(script_path, self.project_root).replace('\\', '/')

    def _serialize_script_info(self, script_id: str, info: Dict) -> Dict:
        """统一序列化脚本信息"""
        filename = info.get("filename", f"{script_id}.py")
        return {
            "id": script_id,
            "name": info.get("name", "Unnamed"),
            "description": info.get("description", ""),
            "filename": filename,
            "relative_path": self._relative_script_path(filename),
            "created_at": info.get("created_at", ""),
            "updated_at": info.get("updated_at", ""),
        }

    def _migrate_legacy_scripts(self):
        """将旧目录中的脚本迁移到项目根目录 scripts/ 下"""
        if self.legacy_scripts_dir.resolve() == self.scripts_dir.resolve():
            return

        if not self.legacy_scripts_dir.exists():
            return

        current_metadata = self._load_metadata_file(self.metadata_file)
        legacy_metadata_file = self.legacy_scripts_dir / "metadata.json"
        legacy_metadata = self._load_metadata_file(legacy_metadata_file)
        merged_metadata = dict(current_metadata)
        changed = False

        for script_id, info in legacy_metadata.items():
            filename = info.get("filename", f"{script_id}.py")
            legacy_file = self.legacy_scripts_dir / filename
            target_file = self.scripts_dir / filename
            has_script_file = legacy_file.exists() or target_file.exists()

            if legacy_file.exists() and not target_file.exists():
                shutil.copy2(legacy_file, target_file)
                changed = True

            if has_script_file and script_id not in merged_metadata:
                merged_metadata[script_id] = {
                    "name": info.get("name", script_id),
                    "description": info.get("description", ""),
                    "filename": filename,
                    "created_at": info.get("created_at", ""),
                    "updated_at": info.get("updated_at", info.get("created_at", "")),
                }
                changed = True

        if not legacy_metadata:
            for legacy_file in self.legacy_scripts_dir.glob("*.py"):
                target_file = self.scripts_dir / legacy_file.name
                if not target_file.exists():
                    shutil.copy2(legacy_file, target_file)
                    changed = True

                script_id = legacy_file.stem
                if script_id not in merged_metadata:
                    timestamp = datetime.fromtimestamp(legacy_file.stat().st_mtime).isoformat()
                    merged_metadata[script_id] = {
                        "name": script_id,
                        "description": "",
                        "filename": legacy_file.name,
                        "created_at": timestamp,
                        "updated_at": timestamp,
                    }
                    changed = True

        if changed:
            self._save_metadata(merged_metadata)
    
    def _load_metadata(self) -> Dict:
        """加载脚本元数据"""
        self._metadata = self._load_metadata_file(self.metadata_file)
        return self._metadata
    
    def _save_metadata(self, metadata: Dict):
        """保存脚本元数据"""
        self._metadata = metadata
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    def list_scripts(self) -> List[Dict]:
        """获取所有脚本列表"""
        self._load_metadata()
        scripts = []
        for script_id, info in self._metadata.items():
            scripts.append(self._serialize_script_info(script_id, info))
        return sorted(scripts, key=lambda x: x.get("created_at", ""), reverse=True)
    
    def add_script(self, name: str, content: str, description: str = "") -> Dict:
        """
        添加新脚本
        
        Args:
            name: 脚本显示名称
            content: 脚本内容
            description: 脚本描述
        
        Returns:
            新创建的脚本信息
        """
        script_id = str(uuid.uuid4())[:8]
        filename = f"{script_id}.py"
        filepath = self.scripts_dir / filename
        
        # 写入脚本文件
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 更新元数据
        now = datetime.now().isoformat()
        self._load_metadata()
        self._metadata[script_id] = {
            "name": name,
            "description": description,
            "filename": filename,
            "created_at": now,
            "updated_at": now
        }
        self._save_metadata(self._metadata)
        
        return self._serialize_script_info(script_id, self._metadata[script_id])
    
    def get_script(self, script_id: str) -> Optional[Dict]:
        """获取单个脚本详情 (含内容)"""
        self._load_metadata()
        if script_id not in self._metadata:
            return None
        
        info = self._metadata[script_id]
        filepath = self.scripts_dir / info["filename"]
        
        content = ""
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        
        script_data = self._serialize_script_info(script_id, info)
        script_data["content"] = content
        return script_data
    
    def update_script(self, script_id: str, name: str = None, 
                      content: str = None, description: str = None) -> Optional[Dict]:
        """更新脚本"""
        self._load_metadata()
        if script_id not in self._metadata:
            return None
        
        info = self._metadata[script_id]
        
        if name is not None:
            info["name"] = name
        if description is not None:
            info["description"] = description
        if content is not None:
            filepath = self.scripts_dir / info["filename"]
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
        
        info["updated_at"] = datetime.now().isoformat()
        self._save_metadata(self._metadata)
        
        return self.get_script(script_id)
    
    def delete_script(self, script_id: str) -> bool:
        """删除脚本"""
        self._load_metadata()
        if script_id not in self._metadata:
            return False
        
        # 删除文件
        info = self._metadata[script_id]
        filepath = self.scripts_dir / info["filename"]
        if filepath.exists():
            filepath.unlink()
        
        # 更新元数据
        del self._metadata[script_id]
        self._save_metadata(self._metadata)
        
        return True
    
    def run_script(self, script_id: str) -> Generator[str, None, None]:
        """
        运行脚本并流式返回输出
        
        Yields:
            脚本输出的每一行
        """
        self._load_metadata()
        if script_id not in self._metadata:
            yield f"[Error] Script {script_id} not found"
            return
        
        info = self._metadata[script_id]
        filepath = self.scripts_dir / info["filename"]
        
        if not filepath.exists():
            yield f"[Error] Script file not found: {filepath}"
            return
        
        relative_path = self._relative_script_path(info['filename'])
        yield f"$ python {relative_path}\n"
        
        try:
            # Use sys.executable for cross-platform compatibility
            process = subprocess.Popen(
                [sys.executable, relative_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                cwd=str(self.project_root)
            )
            
            for line in iter(process.stdout.readline, ''):
                yield line
            
            process.wait()
            
            if process.returncode == 0:
                yield f"\n[Completed] Exit code: 0\n"
            else:
                yield f"\n[Failed] Exit code: {process.returncode}\n"
                
        except Exception as e:
            yield f"\n[Error] {str(e)}\n"
    
    def run_script_sync(self, script_id: str) -> Dict:
        """
        同步运行脚本并返回完整输出
        
        Returns:
            包含 output 和 return_code 的字典
        """
        output_lines = list(self.run_script(script_id))
        return {
            "output": "".join(output_lines),
            "success": "[Completed]" in output_lines[-1] if output_lines else False
        }


# 全局实例
script_manager = ScriptManager()
