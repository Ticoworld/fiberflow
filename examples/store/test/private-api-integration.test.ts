import { webcrypto } from "node:crypto";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildAccessReceiptClaims,
  createAccessReceiptSigner,
  createAccessReceiptVerifier,
  redeemAccessReceipt,
  type AccessReceiptClaims,
  type AccessReceiptConsumeCommand,
  type AccessReceiptStore,
} from "@fiberlatch/access";

import {
  PRIVATE_API_MAX_REDEMPTIONS,
  PRIVATE_API_POLICY_ID,
  PRIVATE_API_PRODUCT_ID,
  PRIVATE_API_PRODUCT_TITLE,
  PRIVATE_API_RESOURCE_ID,
} from "../lib/private-api-constants";
import { isPrivateApiOrder } from "../lib/private-api-policy";
import {
  canRetrievePrivateApiReceipt,
  matchesPaidInvoiceForOrder,
  privateApiEntitlementKey,
} from "../lib/private-api-policy";
import { verifyFiberFlowWebhook } from "../lib/fiberflow";

type RecordState = {
  claims: AccessReceiptClaims;
  redemptionCount: number;
  revoked: boolean;
};

class AtomicTestStore implements AccessReceiptStore {
  readonly records = new Map<string, RecordState>();

  register(claims: AccessReceiptClaims) {
    this.records.set(claims.jti, {
      claims,
      redemptionCount: 0,
      revoked: false,
    });
  }

  async consume(command: AccessReceiptConsumeCommand) {
    const record = this.records.get(command.jti);
    if (!record) return { outcome: "receipt_missing" as const };

    if (
      record.claims.iss !== command.iss ||
      record.claims.sub !== command.sub ||
      record.claims.aud !== command.aud ||
      record.claims.intent_id !== command.intent_id ||
      record.claims.resource_id !== command.resource_id ||
      record.claims.policy_id !== command.policy_id ||
      record.claims.max_redemptions !== command.max_redemptions ||
      record.claims.exp !== command.exp
    ) {
      return { outcome: "authority_mismatch" as const };
    }

    if (record.revoked) return { outcome: "receipt_revoked" as const };
    if (command.current_time >= record.claims.exp) {
      return { outcome: "receipt_expired" as const };
    }
    if (record.redemptionCount >= record.claims.max_redemptions) {
      return { outcome: "receipt_exhausted" as const };
    }

    record.redemptionCount += 1;
    return {
      outcome: "consumed" as const,
      exhausted: record.redemptionCount >= record.claims.max_redemptions,
    };
  }
}

async function makeReceipt(overrides: Partial<AccessReceiptClaims> = {}) {
  const { privateKey, publicKey } = (await webcrypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const kid = `integration-test-${Math.random().toString(36).slice(2)}`;
  const privateJwk = {
    ...(await webcrypto.subtle.exportKey("jwk", privateKey)),
    alg: "EdDSA",
    kid,
  };
  const publicJwk = {
    ...(await webcrypto.subtle.exportKey("jwk", publicKey)),
    alg: "EdDSA",
    kid,
  };
  const now = Math.floor(Date.now() / 1000);
  const claims = buildAccessReceiptClaims({
    iss: "https://fiberflow-store.example.test/access",
    sub: "user-123",
    aud: "fiberflow-store-private-api",
    iat: now,
    nbf: now,
    exp: now + 300,
    jti: `receipt-${kid}`,
    intent_id: "order-123",
    resource_id: PRIVATE_API_RESOURCE_ID,
    policy_id: PRIVATE_API_POLICY_ID,
    payment_ref: "0xpayment-123",
    grant_type: "multi_redemption",
    max_redemptions: PRIVATE_API_MAX_REDEMPTIONS,
    ...overrides,
  });
  const signer = await createAccessReceiptSigner({ privateKey: privateJwk });
  const verifier = await createAccessReceiptVerifier({
    publicKeys: [publicJwk],
    issuer: claims.iss,
    audience: claims.aud,
  });

  return { claims, token: await signer(claims), verifier, publicJwk };
}

function expectedFor(claims: AccessReceiptClaims) {
  return {
    sub: claims.sub,
    resource_id: claims.resource_id,
    policy_id: claims.policy_id,
    intent_id: claims.intent_id,
    max_redemptions: claims.max_redemptions,
  };
}

async function redeem(
  token: string,
  claims: AccessReceiptClaims,
  verifier: Awaited<ReturnType<typeof createAccessReceiptVerifier>>,
  store: AccessReceiptStore,
  expected = expectedFor(claims),
  currentTime = Math.floor(Date.now() / 1000),
) {
  return redeemAccessReceipt({
    token,
    expected,
    verifier,
    store,
    current_time: currentTime,
  });
}

test("the seeded product is the sole private API entitlement product", () => {
  assert.equal(
    isPrivateApiOrder({
      items: [{ productId: PRIVATE_API_PRODUCT_ID, productTitle: PRIVATE_API_PRODUCT_TITLE }],
    } as never),
    true,
  );
  assert.equal(
    isPrivateApiOrder({
      items: [{ productId: "another-product-id", productTitle: PRIVATE_API_PRODUCT_TITLE }],
    } as never),
    false,
  );
});

test("issuance key is stable for duplicate webhook deliveries", async () => {
  const key = privateApiEntitlementKey;
  const persisted = new Map<string, string>();
  const issue = async (orderId: string, paymentRef: string) => {
    const entitlementKey = key(orderId, paymentRef);
    const existing = persisted.get(entitlementKey);
    if (existing) return existing;
    await Promise.resolve();
    const raced = persisted.get(entitlementKey);
    if (raced) return raced;
    const jti = "one-stable-entitlement";
    persisted.set(entitlementKey, jti);
    return jti;
  };

  const [first, second] = await Promise.all([
    issue("order-123", "0xpayment-123"),
    issue("order-123", "0xpayment-123"),
  ]);
  assert.equal(first, second);
  assert.equal(persisted.size, 1);
  assert.notEqual(key("order-123", "0xpayment-123"), key("order-124", "0xpayment-123"));
});

test("authenticated invoice.paid data matches the local invoice before issuance", () => {
  const order = {
    fiberflowInvoiceId: 42,
    paymentHash: "0xpayment-123",
  };
  const payload = {
    id: "event-1",
    type: "invoice.paid" as const,
    created_at: new Date().toISOString(),
    data: {
      invoice_id: 42,
      order_id: "order-123",
      payment_hash: "0xpayment-123",
      amount_in_usd: 1,
      status: "paid" as const,
      customer_email: "buyer@example.com",
      metadata: {},
      success_url: null,
      cancel_url: null,
      payment_url: "https://checkout.example.test/pay",
    },
  };

  assert.equal(matchesPaidInvoiceForOrder(payload, order), true);
  assert.equal(
    matchesPaidInvoiceForOrder(
      { ...payload, data: { ...payload.data, status: "received" } },
      order,
    ),
    false,
  );
  assert.equal(
    matchesPaidInvoiceForOrder(
      { ...payload, data: { ...payload.data, invoice_id: 43 } },
      order,
    ),
    false,
  );
  assert.equal(
    matchesPaidInvoiceForOrder(
      { ...payload, data: { ...payload.data, payment_hash: "0xother-payment" } },
      order,
    ),
    false,
  );
});

test("FiberFlow webhook signatures are required before the payload is trusted", () => {
  const secret = "whsec_test-secret";
  const rawBody = JSON.stringify({ type: "invoice.paid" });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const header = `t=${timestamp},v1=${signature}`;

  assert.equal(verifyFiberFlowWebhook(rawBody, header, secret), true);
  assert.equal(verifyFiberFlowWebhook(`${rawBody}x`, header, secret), false);
  assert.equal(
    verifyFiberFlowWebhook(
      rawBody,
      `t=${timestamp - 301},v1=${signature}`,
      secret,
    ),
    false,
  );
});

test("receipt retrieval requires the paid owner and private API product", () => {
  const paidPrivateOrder = {
    userId: "user-123",
    status: "paid" as const,
    items: [{ productId: PRIVATE_API_PRODUCT_ID, productTitle: PRIVATE_API_PRODUCT_TITLE }],
  };

  assert.equal(canRetrievePrivateApiReceipt(paidPrivateOrder as never, "user-123"), true);
  assert.equal(canRetrievePrivateApiReceipt(paidPrivateOrder as never, "user-999"), false);
  assert.equal(
    canRetrievePrivateApiReceipt(
      { ...paidPrivateOrder, status: "awaiting_payment" } as never,
      "user-123",
    ),
    false,
  );
  assert.equal(
    canRetrievePrivateApiReceipt(
      {
        ...paidPrivateOrder,
        items: [{ productId: "another-product-id", productTitle: "Fiber Hoodie" }],
      } as never,
      "user-123",
    ),
    false,
  );
});

test("valid receipt redeems against the trusted purchaser and resource", async () => {
  const { claims, token, verifier } = await makeReceipt();
  const store = new AtomicTestStore();
  store.register(claims);

  const result = await redeem(token, claims, verifier, store);

  assert.deepEqual(result, { status: "success", exhausted: false });
  assert.equal(store.records.get(claims.jti)?.redemptionCount, 1);
});

test("wrong subject, resource, or policy is denied before consumption", async () => {
  const { claims, token, verifier } = await makeReceipt();
  const store = new AtomicTestStore();
  store.register(claims);

  const wrongSubject = await redeem(token, claims, verifier, store, {
    ...expectedFor(claims),
    sub: "another-user",
  });
  const wrongResource = await redeem(token, claims, verifier, store, {
    ...expectedFor(claims),
    resource_id: "another-resource",
  });
  const wrongPolicy = await redeem(token, claims, verifier, store, {
    ...expectedFor(claims),
    policy_id: "another-policy",
  });

  assert.deepEqual(wrongSubject, { status: "binding_denied", phase: "binding" });
  assert.deepEqual(wrongResource, { status: "binding_denied", phase: "binding" });
  assert.deepEqual(wrongPolicy, { status: "binding_denied", phase: "binding" });
  assert.equal(store.records.get(claims.jti)?.redemptionCount, 0);
});

test("wrong audience and tampered receipts are denied", async () => {
  const { claims, token, verifier, publicJwk } = await makeReceipt();
  const store = new AtomicTestStore();
  store.register(claims);

  const wrongAudienceVerifier = await createAccessReceiptVerifier({
    publicKeys: [publicJwk],
    issuer: claims.iss,
    audience: "another-api",
  });
  const wrongAudience = await redeem(token, claims, wrongAudienceVerifier, store);
  const tampered = await redeem(`${token.slice(0, -1)}x`, claims, verifier, store);

  assert.equal(wrongAudience.status, "verification_denied");
  assert.equal(tampered.status, "verification_denied");
});

test("the final allowed redemption succeeds and the next use is exhausted", async () => {
  const { claims, token, verifier } = await makeReceipt();
  const store = new AtomicTestStore();
  store.register(claims);

  const results = [];
  for (let index = 0; index < PRIVATE_API_MAX_REDEMPTIONS; index += 1) {
    results.push(await redeem(token, claims, verifier, store));
  }
  const replay = await redeem(token, claims, verifier, store);

  assert.deepEqual(results, [
    { status: "success", exhausted: false },
    { status: "success", exhausted: false },
    { status: "success", exhausted: true },
  ]);
  assert.deepEqual(replay, {
    status: "consumption_denied",
    phase: "consumption",
    reason: "receipt_exhausted",
  });
  assert.equal(
    store.records.get(claims.jti)?.redemptionCount,
    PRIVATE_API_MAX_REDEMPTIONS,
  );
});

test("concurrent attempts at a single final slot cannot both succeed", async () => {
  const { claims, token, verifier } = await makeReceipt({
    max_redemptions: 1,
    grant_type: "single_redemption",
  });
  const store = new AtomicTestStore();
  store.register(claims);

  const results = await Promise.all([
    redeem(token, claims, verifier, store),
    redeem(token, claims, verifier, store),
  ]);

  assert.equal(results.filter((result) => result.status === "success").length, 1);
  assert.equal(
    results.filter(
      (result) =>
        result.status === "consumption_denied" && result.reason === "receipt_exhausted",
    ).length,
    1,
  );
});

test("expired receipts are denied", async () => {
  const { claims, token, verifier } = await makeReceipt({
    iat: 100,
    nbf: 100,
    exp: 101,
  });
  const store = new AtomicTestStore();
  store.register(claims);

  const result = await redeem(token, claims, verifier, store, expectedFor(claims), 101);

  assert.equal(result.status, "verification_denied");
});

test("revoked receipts are denied by the host store", async () => {
  const { claims, token, verifier } = await makeReceipt();
  const store = new AtomicTestStore();
  store.register(claims);
  const record = store.records.get(claims.jti);
  assert.ok(record);
  record.revoked = true;

  const result = await redeem(token, claims, verifier, store);

  assert.deepEqual(result, {
    status: "consumption_denied",
    phase: "consumption",
    reason: "receipt_revoked",
  });
});
