<div align="center">
  <img src="frontend\public\portracker-logo.svg" alt="portracker Logo" width="170"/>
  <h1 style="font-size: 3em; margin-bottom: 0.1em;">portracker</h1>
</div>

<p align="center">
  <strong>A self-hosted, real-time port monitoring and discovery tool.</strong>
</p>

<p align="center">
  <a href="https://github.com/mostafa-wahied/portracker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mostafa-wahied/portracker?style=flat-square" alt="License"></a>
  <a href="https://hub.docker.com/r/mostafawahied/portracker"><img src="https://img.shields.io/docker/v/mostafawahied/portracker?label=docker&style=flat-square" alt="Docker Version"></a>
  <a href="https://github.com/mostafa-wahied/portracker/releases"><img src="https://img.shields.io/github/v/release/mostafa-wahied/portracker?style=flat-square" alt="Latest Release"></a>
    <a href="https://github.com/mostafa-wahied/portracker/actions"><img src="https://img.shields.io/github/actions/workflow/status/mostafa-wahied/portracker/docker-publish.yml?style=flat-square" alt="Build Status"></a>
</p>

<p align="center">
  <img src="https://i.postimg.cc/vHcsH0TY/main-light.png" alt="portracker Dashboard Screenshot" style="width: 95%;" />
</p>

通过自动发现系统上的服务，portracker提供了网络的实时、准确映射。它有助于消除电子表格中的手动跟踪，并防止端口冲突导致的部署失败。

---

## 主要功能

- **自动端口发现**: 扫描主机系统以自动查找并显示运行中的服务及其端口。无需手动数据输入。
- **平台特定收集器**: 包括针对 Docker 和 TrueNAS 的专用收集器，可从主机收集丰富的上下文信息。
- **内部端口检测**: 区分内部容器端口和发布的主机端口，提供对容器化服务的完整可见性。
- **轻量级且自包含**: 作为单个进程运行，带有嵌入式 SQLite 数据库。不需要 PostgreSQL 或 Redis 等外部数据库依赖。
- **点对点监控**: 添加其他 `portracker` 实例作为对等节点，从单个仪表板查看所有服务器、容器和 VM。
- **层次分组**: 以父子结构组织服务器，非常适合嵌套服务器，例如将 VM 的 `portracker` 实例嵌套在其物理主机下。
- **增强的 TrueNAS 发现**: 提供可选的 TrueNAS API 密钥，允许 `portracker` 发现正在运行的 VM\* 并收集增强的系统信息，如操作系统版本和正常运行时间。
- **现代响应式 UI**: 简洁的仪表板，支持明暗模式、实时过滤和多种数据布局视图（列表、网格、表格）。

<sub>\*_注意：使用可选API密钥在TrueNAS上发现的VM以只读模式显示。要启用完整监控，请在每个VM上部署portracker实例并将其添加为单独的服务器。_</sub>

## 部署

部署设计为使用 Docker 简单实现。

### 快速开始

**使用 Docker Compose：**

创建一个 `docker-compose.yml` 文件：

```yaml
services:
  portracker:
    image: mostafawahied/portracker:latest
    container_name: portracker
    restart: unless-stopped
    pid: "host"  # Required for port detection
    # Required permissions for system ports service namespace access
    cap_add:
      - SYS_PTRACE     # Linux hosts: read other PIDs' /proc entries
      - SYS_ADMIN      # Docker Desktop: allow namespace access for host ports (required for MacOS)
    security_opt:
      - apparmor:unconfined # Required for system ports
    volumes:
      # Required for data persistence
      - ./portracker-data:/data
      # Required for discovering services running in Docker
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "4999:4999"
    # environment:
      # Optional: For enhanced TrueNAS features
      # - TRUENAS_API_KEY=your-api-key-here
```

然后，运行应用程序：

```sh
docker-compose up -d
```

**使用 Docker Run：**

```sh
docker run -d \
  --name portracker \
  --restart unless-stopped \
  --pid host \
  --cap-add SYS_PTRACE \
  --cap-add SYS_ADMIN \
  --security-opt apparmor=unconfined \
  -p 4999:4999 \
  -v ./portracker-data:/data \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  mostafawahied/portracker:latest
```

### 使用 Docker Proxy 增强安全性

为了增强安全性，您可以使用代理在不直接访问Docker套接字的情况下运行portracker。这将Docker API权限限制为只读操作。

**使用 Docker Compose：**

```yaml
services:
  docker-proxy:
    image: tecnativa/docker-socket-proxy:latest
    container_name: portracker-docker-proxy
    restart: unless-stopped
    environment:
      - CONTAINERS=1
      - IMAGES=1
      - INFO=1
      - NETWORKS=1
      - POST=0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "2375:2375"

  portracker:
    image: mostafawahied/portracker:latest
    container_name: portracker
    restart: unless-stopped
    pid: "host"
    cap_add:
      - SYS_PTRACE
      - SYS_ADMIN
    security_opt:
      - apparmor:unconfined
    volumes:
      - ./portracker-data:/data
    ports:
      - "4999:4999"
    environment:
      - DOCKER_HOST=tcp://docker-proxy:2375
    depends_on:
      - docker-proxy
```

**使用 Docker Run：**

```sh
# Start the Docker proxy
docker run -d \
  --name portracker-docker-proxy \
  --restart unless-stopped \
  -p 2375:2375 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e CONTAINERS=1 \
  -e IMAGES=1 \
  -e INFO=1 \
  -e NETWORKS=1 \
  -e POST=0 \
  tecnativa/docker-socket-proxy:latest

# 启动 portracker
docker run -d \
  --name portracker \
  --restart unless-stopped \
  --pid host \
  --cap-add SYS_PTRACE \
  --cap-add SYS_ADMIN \
  --security-opt apparmor=unconfined \
  -p 4999:4999 \
  -v ./portracker-data:/data \
  -e DOCKER_HOST=tcp://localhost:2375 \
  mostafawahied/portracker:latest
```

## 配置

使用环境变量配置 `portracker`。

| Variable           | Description                                            | Default               |
| ------------------ | ------------------------------------------------------ | --------------------- |
| `PORT`\*           | Web 应用程序将运行的端口。                             | `4999`                |
| `DATABASE_PATH`\*  | 容器内 SQLite 数据库文件的路径。                       | `/data/portracker.db` |
| `TRUENAS_API_KEY`  | 用于增强 TrueNAS 数据收集的可选 API 密钥。             | ` `                   |
| `ENABLE_AUTH`      | 设置为 `true` 以启用认证（v1.2.0+）。                  | `false`               |
| `SESSION_SECRET`   | 仅在启用认证时需要。防止容器重启时登出。               | _random_  |
| `CACHE_TIMEOUT_MS` | 缓存扫描结果的持续时间（毫秒）。                       | `60000`               |
| `DISABLE_CACHE`    | 设置为 `true` 以禁用所有缓存。                         | `false`               |
| `INCLUDE_UDP`      | 设置为 `true` 以在扫描中包含 UDP 端口。                | `false`               |
| `DEBUG`            | 设置为 `true` 以启用详细的应用程序日志记录。           | `false`               |

<sub>\*_必填_</sub>

有关所有环境变量的完整列表和详细说明，请参见 [`.env.example`](.env.example)。

### TrueNAS 集成

<details>
<summary><strong>点击展开 TrueNAS 设置指南</strong></summary>

#### 获取您的 TrueNAS API 密钥

1. 登录到您的 TrueNAS Web 界面
2. 转到 **系统设置 → API 密钥**
3. 点击 **添加** 创建一个新的 API 密钥
4. 给它一个描述性名称（例如 "portracker"）
5. 复制生成的密钥
6. 将其添加到 portracker：
   - **TrueNAS Apps**：编辑您的 portracker 应用 → 添加环境变量：`TRUENAS_API_KEY=your-api-key-here`
   - **Docker Compose**：添加到环境部分：
     ```yaml
     environment:
       - TRUENAS_API_KEY=your-api-key-here
     ```

#### 您将看到的内容

配置 API 密钥后，portracker 将显示：
- ✅ TrueNAS 原生应用（来自应用目录）
- ✅ 虚拟机 (VM)
- ✅ LXC 容器
- ✅ 增强的系统信息（操作系统版本、正常运行时间等）

如果没有API密钥，您将只能看到Docker容器和系统端口。

有关超时配置选项，请参见 [`.env.example`](.env.example)。

</details>

### 认证设置 (v1.2.0+)

portracker 包含可选的认证功能，用于保护仪表板访问：

1. **启用认证**：在环境变量中设置 `ENABLE_AUTH=true`
2. **首次设置**：首次访问时，您将看到一个设置向导，用于创建管理员账户
3. **登录**：使用您的管理员凭证访问仪表板
4. **保持登录**（可选）：设置 `SESSION_SECRET` 以避免容器重启时登出

**带认证的示例：**

```yaml
services:
  portracker:
    image: mostafawahied/portracker:latest
    environment:
      - ENABLE_AUTH=true
      - SESSION_SECRET=your-random-secret-here-change-this
```

**重要说明：**
- 为了保持向后兼容性，认证功能**默认禁用**
- 启用后，仪表板需要登录，但用于对等通信的 API 端点仍然可访问
- 计划在 v1.3.0 中为对等通信添加 API 密钥认证

## 技术栈

- **后端**: Node.js, Express, WebSocket, better-sqlite3
- **前端**: React, Vite, Tailwind CSS, Shadcn UI
- **容器化**: Docker

## 路线图

未来的开发将基于社区反馈来改进应用程序。主要领域包括：
- ~~添加用户认证~~ ✅ **已在 v1.2.0 中添加**（带设置向导的可选认证）
- 为对等通信添加 API 密钥认证（计划用于 v1.3.0）
- 扩展针对其他主机系统的平台特定收集器库
- 解决错误并纳入社区请求的更改

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=mostafa-wahied/portracker&type=Date)](https://www.star-history.com/#mostafa-wahied/portracker&Date)

## 贡献

欢迎贡献！请随时打开 issue 报告错误或提出功能建议，或提交 pull request 来改进代码。

## 许可证

该项目采用 MIT 许可证 - 详见 [LICENSE](https://github.com/Mostafa-Wahied/portracker/blob/main/LICENSE)