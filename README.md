# ByteAlchemy

## 项目概述

ByteAlchemy 是我为了能够在应对ctf中非标准加密时以一种更加从容的姿态进行解密而做出的尝试（没有ai不会写的样子真的很狼狈）。项目采用 **Electron + React (Vite)** 构建前端，**Python FastAPI** 提供后端服务。
目前仅针对 **linux** 进行开发，windows下可以通过 wsl 正常运行 

核心设计参考 CyberChef 的操作链模型：用户可通过拖拽方式组合多种编码、加解密、哈希算子，实时查看输入输出结果，并支持自定义 S‑Box、Magic Swap 等高级功能。

---

## 功能模块

### 1. 解码器 (Decoder)

提供 CyberChef 风格的操作链编辑器，支持拖拽排序、一键启用/禁用单个算子。

| 类别   | 支持的操作                                                                |
| ---- | -------------------------------------------------------------------- |
| 编码   | Base16、Base32、Base64、Base85（ASCII85 / Z85）、URL 编码、HTML 实体、Unicode 转义 |
| 对称加密 | AES（ECB/CBC/CFB/OFB/CTR）、SM4（ECB/CBC）、DES、3DES、RC4                   |
| 哈希   | MD5（可自定义初始化向量、K 表、轮移参数）                                              |

- **多格式输入输出**：UTF‑8、HEX、ASCII 互转，支持大小端切换
- **自定义 S‑Box**：内置标准 AES/SM4/RC4/DES S‑Box，支持 16×16 矩阵编辑、克隆、导入导出
- **Magic Swap**：AES/SM4 支持密钥调度轮换 (swap_key_schedule) 与数据轮换 (swap_data_round)，便于分析非标变体算法

### 2. 代码格式化 (Formatter)

离线格式化以下语言：

- JSON
- XML
- HTML
- SQL
- CSS
- Python

### 3. 正则工具 (Regex)

- **转义**：将任意字符串转为正则安全格式
- **生成**：根据数字、大小写字母、自定义字符集自动生成匹配模式

### 4. 脚本库 (Script Library)

- **脚本管理**：创建、编辑、删除用户 Python 脚本
- **参数解析**：自动识别脚本中的 `input()` 调用，生成预填参数对话框
- **交互终端**：基于 xterm.js 与 WebSocket PTY 的终端（Linux/macOS），支持：
  - 连接状态指示灯（呼吸动画）

### 5. 密钥重构 (Key Reconstruction)

积木式编程环境，用于快速生成密钥处理脚本：

| 分类          | 示例积木                                                  |
| ----------- | ----------------------------------------------------- |
| 输入          | HEX 输入、字节数组、字符串、整数、范围生成                               |
| 变换          | XOR 常量/密钥、加/减/乘常量、字节反转、两两交换                           |
| 位运算         | 循环左移/右移、移位、半字节交换、按位取反、AND/OR                          |
| S‑Box       | S 盒查表、逆 S 盒查表、自定义查表                                   |
| 循环          | FOR 循环、遍历字节、WHILE 循环                                  |
| 函数          | 定义函数、返回数据/HEX、打印 HEX                                  |
| 变量          | 赋值、读取、切片、拼接                                           |
| CTypes/Libc | 加载动态库 (CDLL)、srand、rand、struct pack                   |
| 恶意代码分析      | CryptGenRandom 模拟、srand(Time) 弱随机、线性同余生成器、动态 API 加载模式 |
| 加密算法        | AES 密钥生成、导出密钥、MD5、SHA256、ChaCha20 初始状态                |
| 自定义         | 用户可保存常用积木组合                                           |

- **双向同步**：积木链与生成代码可双向解析转换
- **在线执行**：直接在工具内执行生成的 Python 代码并查看输出

### 6. 设置 (Settings)

- S‑Box 管理（新建、编辑、删除、克隆）
- 终端壁纸上传与透明度调节
- 主题配置

---

## 快速开始

### 环境要求

>  Python 3.10+
> 
>  Node.js 18+（仅开发模式需要）

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行程序

```bash
python run.py
```

脚本会依次启动 FastAPI 后端（端口 3335）、WebSocket 终端服务（端口 3336），并自动构建前端、打开 Electron 客户端。

### 开发模式

```bash
cd front
npm install
npm run dev
```

---

## 项目结构

```
ByteAlchemy/
├── run.py                     # 一键启动脚本
├── backend/
│   └── server.py              # FastAPI 服务端
├── core/
│   ├── decoder/               # 编码/解码、加解密算子实现
│   │   ├── pipeline.py        # 操作链核心
│   │   ├── base.py            # Base 编码族
│   │   ├── aes.py / aes_pure.py
│   │   ├── sm4.py
│   │   ├── des.py
│   │   ├── rc4.py
│   │   ├── md5.py
│   │   ├── html.py / url.py / unicode.py
│   ├── formatter/             # 代码格式化工具
│   ├── key_recreat/           # 密钥重构积木定义与代码生成
│   ├── script/                # 脚本管理与终端服务
│   └── regex.py               # 正则工具
├── app/
│   ├── logic/
│   │   └── sbox_manager.py    # S‑Box 管理逻辑
│   └── sboxes.json            # 自定义 S‑Box 存储
├── front/                     # React (Vite) 前端源码
├── electron/                  # Electron 主进程
└── requirements.txt
```

---

## 技术栈

| 层级  | 技术                                                                     |
| --- | ---------------------------------------------------------------------- |
| 前端  | React 18、Vite、TypeScript、react-dnd、xterm.js、Tailwind CSS、Framer Motion |
| 桌面  | Electron                                                               |
| 后端  | Python 3、FastAPI、Uvicorn、PyCryptodome、websockets                       |

---

## 版本

当前版本：**0.0.2 BETA**

## 作者

QAQ

---

## API 参考

后端服务启动后默认监听 `http://127.0.0.1:3335`，以下为主要接口：

### 编码/解码

| 方法   | 路径                    | 说明              |
| ---- | --------------------- | --------------- |
| POST | `/api/base64/encode`  | Base64 编码       |
| POST | `/api/base64/decode`  | Base64 解码       |
| POST | `/api/base32/encode`  | Base32 编码       |
| POST | `/api/base32/decode`  | Base32 解码       |
| POST | `/api/base16/encode`  | Base16 (Hex) 编码 |
| POST | `/api/base16/decode`  | Base16 解码       |
| POST | `/api/base85/encode`  | Base85 编码       |
| POST | `/api/base85/decode`  | Base85 解码       |
| POST | `/api/url/encode`     | URL 编码          |
| POST | `/api/url/decode`     | URL 解码          |
| POST | `/api/html/encode`    | HTML 实体编码       |
| POST | `/api/html/decode`    | HTML 实体解码       |
| POST | `/api/unicode/encode` | Unicode 转义编码    |
| POST | `/api/unicode/decode` | Unicode 转义解码    |

### 加解密

| 方法   | 路径                  | 说明      |
| ---- | ------------------- | ------- |
| POST | `/api/aes/encrypt`  | AES 加密  |
| POST | `/api/aes/decrypt`  | AES 解密  |
| POST | `/api/sm4/encrypt`  | SM4 加密  |
| POST | `/api/sm4/decrypt`  | SM4 解密  |
| POST | `/api/des/encrypt`  | DES 加密  |
| POST | `/api/des/decrypt`  | DES 解密  |
| POST | `/api/3des/encrypt` | 3DES 加密 |
| POST | `/api/3des/decrypt` | 3DES 解密 |
| POST | `/api/rc4/encrypt`  | RC4 加密  |
| POST | `/api/rc4/decrypt`  | RC4 解密  |
| POST | `/api/md5/hash`     | MD5 哈希  |

### 操作链

| 方法   | 路径                  | 说明    |
| ---- | ------------------- | ----- |
| POST | `/api/pipeline/run` | 执行操作链 |

请求体示例：

```json
{
  "data": "Hello World",
  "operations": [
    { "name": "base64_encode", "params": {} },
    { "name": "url_encode", "params": {} }
  ]
}
```

### 格式化

| 方法   | 路径            | 说明    |
| ---- | ------------- | ----- |
| POST | `/api/format` | 代码格式化 |

### 正则工具

| 方法   | 路径                    | 说明     |
| ---- | --------------------- | ------ |
| POST | `/api/regex/escape`   | 字符串转义  |
| POST | `/api/regex/generate` | 生成正则模式 |

### 脚本库

| 方法     | 路径                  | 说明     |
| ------ | ------------------- | ------ |
| GET    | `/api/scripts`      | 获取脚本列表 |
| POST   | `/api/scripts`      | 创建脚本   |
| GET    | `/api/scripts/{id}` | 获取脚本详情 |
| PUT    | `/api/scripts/{id}` | 更新脚本   |
| DELETE | `/api/scripts/{id}` | 删除脚本   |

### S‑Box 管理

| 方法     | 路径                        | 说明            |
| ------ | ------------------------- | ------------- |
| GET    | `/api/sbox/names`         | 获取所有 S‑Box 名称 |
| GET    | `/api/sbox/get/{name}`    | 获取指定 S‑Box 内容 |
| POST   | `/api/sbox/save`          | 保存自定义 S‑Box   |
| DELETE | `/api/sbox/delete/{name}` | 删除自定义 S‑Box   |

### 密钥重构

| 方法   | 路径                  | 说明        |
| ---- | ------------------- | --------- |
| GET  | `/api/key-blocks`   | 获取所有积木块定义 |
| POST | `/api/key-generate` | 生成代码      |
| POST | `/api/key-execute`  | 执行代码      |
| POST | `/api/key-parse`    | 解析代码为积木链  |

---

## 使用示例

### 示例 1：Base64 编码后 URL 编码

1. 打开 **解码器** 页面
2. 从左侧算子列表拖拽 **Base64 编码** 到操作链
3. 继续拖拽 **URL 编码** 到操作链
4. 在输入框输入原始文本
5. 点击 **执行** 按钮查看结果

### 示例 2：使用自定义 S‑Box 解密 SM4

1. 进入 **设置 → S‑Box 管理**
2. 点击 **克隆** 标准 SM4 S‑Box，修改部分字节后保存为 `My SM4`
3. 返回 **解码器** 页面
4. 添加 **SM4 解密** 算子，在参数面板选择 `My SM4`
5. 填写密钥、IV、密文后执行

### 示例 3：密钥重构积木编程

1. 进入 **密钥重构** 页面
2. 从左侧拖入 **HEX 输入** 积木，填入初始数据
3. 添加 **XOR 常量** 积木设置异或值
4. 添加 **S 盒查表** 积木选择标准 AES S‑Box
5. 添加 **返回 HEX** 积木
6. 点击 **执行** 查看处理结果

---

## 常见问题

### 1. 启动时提示端口被占用

`run.py` 启动前会自动尝试释放 3335 和 3336 端口。如果仍失败，请手动终止占用进程：

```bash
lsof -i :3335 | awk 'NR>1 {print $2}' | xargs kill -9
```

### 2. 前端构建失败

确保 Node.js 版本 >= 18，并在 `front` 目录下执行：

```bash
npm install
npm run build
```

### 3. PyCryptodome 安装失败

部分系统需要先安装编译工具：

```bash
# Ubuntu/Debian
sudo apt install build-essential python3-dev
```

---

## 更新日志

### v0.0.2 BETA (2026-01-23)

- 新增 DES/3DES、MD5、RC4 加解密模块
- 新增密钥重构积木式编程环境
- 新增恶意代码分析类积木（CryptGenRandom、弱随机模拟等）
- 新增 CTypes/Libc 积木（动态库加载、srand/rand 调用）
- 支持积木↔代码双向同步
- 脚本库新增交互式终端（跨平台 PTY）
- 终端支持自定义壁纸与透明度
- 修复 HEX 输入格式处理问题
- 优化操作链拖拽体验

---

## 下一步计划

> 下一步会加入一个工具箱，我想通过GUI调用hashcat这样的工具，这样就可以不用再去记忆那些繁琐的参数和选项了

---

## 许可证

本项目采用 [MIT License](LICENSE) 开源。
