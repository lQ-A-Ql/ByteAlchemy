# ByteAlchemy - 现代化极客加解密工具

## QAQ的自言自语

其实我更愿意叫他ctf的奇怪小工具，写这个玩意儿的起因是前两天的ciscn由于不会写解密脚本啊逆向和流量的最后一个SM4差点就寄啦，还好队里有大手子带我躺。然后网上又找不到好用的工具 cyberchef 又只能对标准的加密算法进行操作，
诶正好白嫖了gemini pro 那就下一个 antigravity 自己搓一个吧

整个项目是用了 `electron + vue3 + fastapi + uvicorn` 的形式 调用了element-plus的部分组件，然后decoder部分借鉴了一下cyberchef的布局
我放一点小插图
<img width="1402" height="900" alt="image" src="https://github.com/user-attachments/assets/b765b7e0-5347-488f-b14e-5b4f410871a9" />
<img width="1402" height="901" alt="image" src="https://github.com/user-attachments/assets/918b045f-2df0-4435-989a-4d90d16fb438" />
<img width="1426" height="939" alt="image" src="https://github.com/user-attachments/assets/c979eda0-659a-49ae-8865-7d3755f944ed" />

加密好像有点问题来着，但是解密没出错就不管他啦 ciscn那道流量的密钥是 `ac46fb610b313b4f32fc642d8834b456` 密文我丢项目里 感兴趣的可以试试


好啦 接下来的介绍就交给AI吧

**ByteAlchemy** 是一款基于 **Electron + Vue 3** 构建的现代化图形化调试工具，后端由 **Python FastAPI** 驱动。它采用了类似 **CyberChef** 的“操作链”设计理念，旨在为安全研究人员和开发者提供便捷、直观的编码与加解密验证体验。

## ✨ 核心特性

### 1. CyberChef 风格操作链 (Operation Chain)
- **拼图式操作**：通过拖放不同的加解密算子构建复杂的处理流程。
- **实时反馈**：支持在链中动态调整参数（如秘钥、IV、S 盒），并即时查看输出结果。
- **拖拽排序**：使用 `vuedraggable` 实现的操作算子自由排序，逻辑调整极其顺滑。

### 2. 独家 "Magic S-Box" 支持
- **可视化编辑**：内置 16x16 矩阵视图，直观展示 AES/SM4 等算法的置换盒（S-Box）。
- **克隆与自定义**：支持基于标准 S 盒（AES/SM4）进行克隆并修改，这在分析非标加密算法时极为有用。
- **原生算法驱动**：配套纯 Python 实现的 AES 引擎，完美兼容非标准自定义 S 盒。

### 3. 专业级工作区
- **全格式支持**：输入输出区域支持 **UTF-8、HEX、ASCII** 相互转换。
- **大小端切换**：针对 Hex 数据一键切换 **Big-Endian / Little-Endian**。
- **多样化格式化**：内置 **JSON** 和 **Python** 代码格式化修复工具。

### 4. 极致视觉体验
- **Deep Purple 主题**：借鉴 SiUI 的深紫色现代极客美学，长时间使用不疲劳。
- **响应式界面**：多栏布局，自动在大屏幕上扩展工作区域。

### 5. 高级模块化与编码
- **SM4 / AES Magic Swap**：支持粒度控制的魔改功能（密钥扩展交换 / 数据轮交换），轻松应对非标算法。
- **模块开关**：操作链中的步骤支持一键启用/禁用，调试更灵活。
- **全能代码格式化**：内置 JSON, XML, HTML, SQL, CSS, Python 六大语言的离线格式化工具。

## 🚀 快速开始

本项目已完成封装，支持在仅有 Python 环境的系统下运行（无需预装 Node.js）。
本项目已完成封装，支持在仅有 Python 环境的系统下运行（无需预装 Node.js）。
但由于是linux环境开发的，切换到windows下可能还是需要使用 `npm install` + `npm run build` 重新编译一下
（因为我在windows上跑的时候报错了，说是找不到electron）

### 1. 安装 Python 依赖
```bash
pip install -r requirements.txt
```

### 2. 启动程序 (推荐)
直接运行根目录下的启动脚本：
```bash
python run.py
```
该脚本会自动启动 Python 后端并唤起预编译好的 Electron 客户端。

### 3. 开发模式 (需 Node.js)
```bash
npm install
npm run electron:dev
```

## 📂 项目结构

```
decrypt/
├── run.py                 # 一键启动脚本
├── backend/               # FastAPI 服务端 (Python)
├── core/                  # 加解密核心算法库 (Python)
├── electron/              # Electron 主进程与预加载脚本
├── src/                   # Vue 3 前端源代码
└── dist/                  # 预编译的前端资产
```

## 🛠️ 技术栈
- **Frontend**: Vue 3, Vite, Element Plus, Axios, Vuedraggable
- **Shell**: Electron
- **Backend**: Python 3, FastAPI, Uvicorn, PyCryptodome

## 最后的碎碎念
第一次写开源工具，问题还是有点小多啊，还是希望大家多多包涵（这玩意儿我都感觉不大好用说是）
然后目前是 `decoder+formatter+regex` 嘛后面我想加入一个调用hashcat之类的工具的板块，这些玩意儿总是记不住指令
诶再加一个自定义的解密脚本库 嘿嘿嘿。

---
**版本**: 0.0.1
**作者**: QAQ




