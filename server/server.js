/**
 * Braintree Node.js Backend
 * 
 * Required env vars:
 *   BRAINTREE_ENVIRONMENT=sandbox   (or production)
 *   BRAINTREE_MERCHANT_ID=your_merchant_id
 *   BRAINTREE_PUBLIC_KEY=your_public_key
 *   BRAINTREE_PRIVATE_KEY=your_private_key
 */

const express = require("express");
const braintree = require("braintree");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));

// ─── Braintree Gateway ──────────────────────────────────────────────────────

const gateway = new braintree.BraintreeGateway({
  environment:
    process.env.BRAINTREE_ENVIRONMENT === "production"
      ? braintree.Environment.Production
      : braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID || "your_merchant_id",
  publicKey: process.env.BRAINTREE_PUBLIC_KEY || "your_public_key",
  privateKey: process.env.BRAINTREE_PRIVATE_KEY || "your_private_key",
});

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /api/client-token
 * 生成客户端令牌，前端 Drop-in UI 需要它来初始化
 */
app.get("/api/client-token", async (req, res) => {
  try {
    const customerId = req.query.customerId; // 可选：已有客户的 ID

    const options = customerId ? { customerId } : {};
    const response = await gateway.clientToken.generate(options);

    res.json({ clientToken: response.clientToken });
  } catch (err) {
    console.error("生成 client token 失败:", err);
    res.status(500).json({ error: "无法生成客户端令牌", details: err.message });
  }
});

/**
 * POST /api/checkout
 * 处理支付 nonce，创建一笔交易
 * Body: { paymentMethodNonce, amount, orderId? }
 */
app.post("/api/checkout", async (req, res) => {
  const { paymentMethodNonce, amount, orderId } = req.body;

  if (!paymentMethodNonce || !amount) {
    return res.status(400).json({ error: "缺少 paymentMethodNonce 或 amount" });
  }

  try {
    const result = await gateway.transaction.sale({
      amount: parseFloat(amount).toFixed(2),
      paymentMethodNonce,
      orderId: orderId || `order-${Date.now()}`,
      options: {
        submitForSettlement: true, // 自动提交结算
      },
    });

    if (result.success) {
      const tx = result.transaction;
      res.json({
        success: true,
        transactionId: tx.id,
        status: tx.status,
        amount: tx.amount,
        createdAt: tx.createdAt,
        paymentType: tx.paymentInstrumentType,
      });
    } else {
      // Braintree 验证失败
      const errors = result.errors?.deepErrors() || [];
      res.status(422).json({
        success: false,
        message: result.message,
        errors: errors.map((e) => ({ code: e.code, message: e.message })),
      });
    }
  } catch (err) {
    console.error("交易失败:", err);
    res.status(500).json({ error: "服务器内部错误", details: err.message });
  }
});

/**
 * GET /api/transaction/:id
 * 查询单笔交易详情
 */
app.get("/api/transaction/:id", async (req, res) => {
  try {
    const transaction = await gateway.transaction.find(req.params.id);
    res.json({ transaction });
  } catch (err) {
    res.status(404).json({ error: "找不到该交易", details: err.message });
  }
});

/**
 * POST /api/refund/:id
 * 对一笔已结算的交易发起退款
 * Body: { amount? }  ← 省略则全额退款
 */
app.post("/api/refund/:id", async (req, res) => {
  try {
    const { amount } = req.body;
    const result = amount
      ? await gateway.transaction.refund(req.params.id, amount)
      : await gateway.transaction.refund(req.params.id);

    if (result.success) {
      res.json({ success: true, refundTransaction: result.transaction });
    } else {
      res.status(422).json({ success: false, message: result.message });
    }
  } catch (err) {
    res.status(500).json({ error: "退款失败", details: err.message });
  }
});

/**
 * POST /api/void/:id
 * 撤销一笔尚未结算的交易
 */
app.post("/api/void/:id", async (req, res) => {
  try {
    const result = await gateway.transaction.void(req.params.id);
    if (result.success) {
      res.json({ success: true, transaction: result.transaction });
    } else {
      res.status(422).json({ success: false, message: result.message });
    }
  } catch (err) {
    res.status(500).json({ error: "撤销失败", details: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Braintree 服务器运行在 http://localhost:${PORT}`);
  console.log(`   环境: ${process.env.BRAINTREE_ENVIRONMENT || "sandbox"}`);
});
