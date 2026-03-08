# Braintree Node.js 前后端支付集成

完整的 Braintree 支付集成示例，包含 Node.js 后端和 HTML 前端。

## 目录结构

```
braintree-demo/
├── server/
│   └── server.js        # Express 后端（API + 静态文件服务）
├── public/
│   └── index.html       # 前端（Braintree Drop-in UI）
├── package.json
├── .env.example         # 环境变量模板
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入你在 [Braintree 控制台](https://sandbox.braintreegateway.com/) 的密钥：

```
BRAINTREE_ENVIRONMENT=sandbox
BRAINTREE_MERCHANT_ID=your_merchant_id
BRAINTREE_PUBLIC_KEY=your_public_key
BRAINTREE_PRIVATE_KEY=your_private_key
```

### 3. 启动服务

```bash
npm start
# 或开发模式（自动重启）
npm run dev
```

访问 http://localhost:3000

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/client-token` | 生成前端初始化所需的 client token |
| POST | `/api/checkout` | 处理支付，创建交易 |
| GET  | `/api/transaction/:id` | 查询交易详情 |
| POST | `/api/refund/:id` | 申请退款（全额或部分） |
| POST | `/api/void/:id` | 撤销未结算的交易 |

### POST /api/checkout

**请求体：**
```json
{
  "paymentMethodNonce": "nonce-from-dropin-ui",
  "amount": "109.00",
  "orderId": "order-123"
}
```

**成功响应：**
```json
{
  "success": true,
  "transactionId": "abc123",
  "status": "submitted_for_settlement",
  "amount": "109.00",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "paymentType": "credit_card"
}
```

---

## 沙盒测试卡号

| 卡号 | 结果 |
|------|------|
| 4111 1111 1111 1111 | 成功 |
| 4000 1111 1111 1116 | 失败（处理器拒绝） |
| 4000 0000 0000 0002 | 失败（卡被拒绝） |

到期日期：任意未来日期，CVV：任意 3 位数字

---

## 流程说明

```
前端                          后端                        Braintree
  │                             │                              │
  │── GET /api/client-token ──► │── clientToken.generate() ──►│
  │◄── { clientToken } ─────── │◄─────────────────────────── │
  │                             │                              │
  │ (Drop-in UI 初始化)         │                              │
  │ 用户填写支付信息            │                              │
  │ Drop-in 返回 paymentNonce   │                              │
  │                             │                              │
  │── POST /api/checkout ─────► │── transaction.sale() ──────►│
  │   { nonce, amount }         │                              │
  │◄── { success, txId } ───── │◄─── result ─────────────── │
```
