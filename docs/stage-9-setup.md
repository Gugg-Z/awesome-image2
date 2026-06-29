# 阶段 9：登录、数据库与充值闭环

## 本地初始化

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 启动 PostgreSQL：

```bash
docker compose up -d
```

3. 推送 Prisma schema 并导入 `data/cases.json`：

```bash
pnpm db:setup
```

4. 启动开发服务：

```bash
pnpm dev
```

## 登录与权限

- `/login` 提供 Demo 用户和 Demo 管理员两个入口。
- 默认 `DEMO_LOGIN_ENABLED=true`，方便开发验收。
- 默认 `AUTH_REQUIRED=false`，接口会保留原型阶段的 demo fallback。
- 当准备验收真实权限时，将 `AUTH_REQUIRED=true`，未登录用户会收到 `401`，非管理员访问后台 API 会收到 `403`。

## 充值闭环

- `/api/recharge/packages` 返回充值包。
- `/api/recharge/mock` 模拟支付成功并写入 `CreditTransaction`，类型为 `RECHARGE`。
- 用户中心 `/account` 已接入充值按钮，充值后会刷新余额和积分流水。

## 后续接真实支付

保留当前 mock 充值接口作为开发入口。接真实支付时建议新增：

- `PaymentOrder` 数据模型，记录订单号、金额、状态、渠道、回调原文。
- `/api/payments/create` 创建支付订单。
- `/api/payments/webhook` 校验签名后入账。
- 支付成功入账仍复用 `CreditTransaction` 的 `RECHARGE` 类型。
