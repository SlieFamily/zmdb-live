# 项目简介

本项目 Fork 自 [原zimu.live仓库](https://github.com/sixiwanzi-live/zmdb)，因原仓库仅提供了前后端的简单逻辑，但并未给出诸如：前后端配置文件设置、API请求逻辑、自动录播处理、用户身份验证等进阶实现（这是现行字幕库网站都拥有的功能）。因此本项目是一个对此的补充和实现。

## 主要功能

- **字幕管理**：支持字幕的上传、下载、分段、编辑等操作。
- **剪辑管理**：对视频或音频片段进行管理，包括剪辑的增删改查。
- **作者与组织管理**：支持作者、组织的增删改查及相关信息维护。
- **API 接口**：后端提供丰富的 RESTful API，供前端调用。

## 目录结构

- `backend/`：后端 Node.js 服务，包含 API、服务、数据访问层等。
- `frontend/`：Web 前端，基于 React 实现，提供用户界面和交互。
- `tool/`：工具模块，包含第三方接口调用、辅助服务等。
- `db/`：Sqlite3 数据库，后端基于 Better Sqlite3 实现访问。

## 快速启用

### 安装依赖
本项目主要基于 `node.js`：

- **后端**：`koa` 实现
- **前端**：`react-scripts` 实现
- **剪辑**：需要 `ffmpeg` 支持
- **录播**：需要 [录播姬](https://github.com/BililiveRecorder/BililiveRecorder) 支持

> 请确保已安装以上程序.

安装其他前后端所需的依赖和文件：
```bash
cd backend
npm install
```
- 详见 `backend/package.json`

```bash
cd tool
npm install
```
- 详见 `tool/package.json`

```bash
cd frontend
npm install
npm run build
```
- 详见 `frontend/package.json`，为后端创建必须的 `build` 目录和 `node_modules` 目录


### 相关配置
- **数据库相关**: 在 `backend/` 目录下新建 `config.js`，内容参考 `config.js.tpl` 或 `config.tpl.js`
- **前端显示相关**: 在 `frontend/src/` 目录下新建 `config.js`，内容参考 `config.js.tpl` 或 `config.tpl.js`
- **直播处理相关**: 在 `tool/` 目录下新建 `config.js`，内容参考 `config.js.tpl` 或 `config.tpl.js`

> 默认前端端口号 3000，后端端口号 4000，工具端口号 5000.
> 
> 本项目提供了 `frontend/src/setProxy.js` 在开发模式下对后端/工具端口进行了反向代理

### 后端服务启动

```bash
cd backend
npm start
```

### 工具服务启动

```bash
cd backend
npm start
```

### 前端网页启动

- 开发模式测试

```bash
cd frontend
npm start
```

- 使用 Nginx 启动 （推荐）

使用本项目根目录下的 `nginx.conf` 替换