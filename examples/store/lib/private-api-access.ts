import "server-only";

import {
  buildAccessReceiptClaims,
  createAccessReceiptSigner,
  createAccessReceiptVerifier,
  redeemAccessReceipt,
  type AccessReceiptClaims,
  type AccessReceiptJwk,
  type AccessReceiptRedemptionResult,
  type AccessReceiptStore,
} from "@fiberlatch/access";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "lib/db";
import { accessEntitlements } from "lib/db/schema";
import type { Order } from "lib/commerce/types";

import {
  PRIVATE_API_MAX_REDEMPTIONS,
  PRIVATE_API_POLICY_ID,
  PRIVATE_API_RECEIPT_LIFETIME_SECONDS,
  PRIVATE_API_RESOURCE_ID,
} from "./private-api-constants";
import { isPrivateApiOrder } from "./private-api-policy";

export { isPrivateApiOrder } from "./private-api-policy";

type AccessEntitlement = typeof accessEntitlements.$inferSelect;

const PRIVATE_API_ISSUER =
  process.env.FIBERLATCH_ISSUER ?? "https://fiberflow-store.example.test/access";
const PRIVATE_API_AUDIENCE =
  process.env.FIBERLATCH_AUDIENCE ?? "fiberflow-store-private-api";

type Runtime = {
  signer: Awaited<ReturnType<typeof createAccessReceiptSigner>>;
  verifier: Awaited<ReturnType<typeof createAccessReceiptVerifier>>;
};

let runtimePromise: Promise<Runtime> | undefined;

function parseJwk(name: string): AccessReceiptJwk {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(`${name} is required for FiberLatch access`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${name} must contain a JSON Web Key object`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${name} must contain a JSON Web Key object`);
  }

  return parsed as AccessReceiptJwk;
}

function getRuntime(): Promise<Runtime> {
  runtimePromise ??= (async () => {
    const privateKey = parseJwk("FIBERLATCH_PRIVATE_JWK");
    const publicKey = parseJwk("FIBERLATCH_PUBLIC_JWK");
    const privateKid = privateKey.kid;
    const publicKid = publicKey.kid;

    if (privateKid !== publicKid) {
      throw new Error("FIBERLATCH_PRIVATE_JWK and FIBERLATCH_PUBLIC_JWK must share kid");
    }

    return {
      signer: await createAccessReceiptSigner({ privateKey }),
      verifier: await createAccessReceiptVerifier({
        publicKeys: [publicKey],
        issuer: PRIVATE_API_ISSUER,
        audience: PRIVATE_API_AUDIENCE,
      }),
    };
  })();

  return runtimePromise;
}

function claimsFromEntitlement(entitlement: AccessEntitlement): AccessReceiptClaims {
  return buildAccessReceiptClaims({
    iss: entitlement.issuer,
    sub: entitlement.userId,
    aud: entitlement.audience,
    iat: entitlement.issuedAt,
    nbf: entitlement.notBefore,
    exp: entitlement.expiresAt,
    jti: entitlement.jti,
    intent_id: entitlement.intentId,
    resource_id: entitlement.resourceId,
    policy_id: entitlement.policyId,
    payment_ref: entitlement.paymentRef,
    grant_type: entitlement.grantType as AccessReceiptClaims["grant_type"],
    max_redemptions: entitlement.maxRedemptions,
  });
}

async function signEntitlement(entitlement: AccessEntitlement): Promise<string> {
  const { signer } = await getRuntime();
  return signer(claimsFromEntitlement(entitlement));
}

export async function signPrivateApiEntitlement(
  entitlement: AccessEntitlement,
): Promise<string> {
  return signEntitlement(entitlement);
}

export async function issuePrivateApiEntitlement(input: {
  order: Pick<Order, "id" | "userId" | "status" | "paymentHash" | "items">;
  paymentRef: string;
  now?: number;
}): Promise<{ entitlement: AccessEntitlement; receipt: string }> {
  if (input.order.status !== "paid") {
    throw new Error("A paid order is required before issuing private API access");
  }

  if (!isPrivateApiOrder(input.order)) {
    throw new Error("The order does not contain Private API Access");
  }

  if (!input.order.paymentHash || input.order.paymentHash !== input.paymentRef) {
    throw new Error("The FiberFlow payment reference does not match the order");
  }

  const { issuer, audience } = {
    issuer: PRIVATE_API_ISSUER,
    audience: PRIVATE_API_AUDIENCE,
  };
  const issuedAt = input.now ?? Math.floor(Date.now() / 1000);
  const claims = buildAccessReceiptClaims({
    iss: issuer,
    sub: input.order.userId,
    aud: audience,
    iat: issuedAt,
    nbf: issuedAt,
    exp: issuedAt + PRIVATE_API_RECEIPT_LIFETIME_SECONDS,
    jti: randomUUID(),
    intent_id: input.order.id,
    resource_id: PRIVATE_API_RESOURCE_ID,
    policy_id: PRIVATE_API_POLICY_ID,
    payment_ref: input.paymentRef,
    grant_type: "multi_redemption",
    max_redemptions: PRIVATE_API_MAX_REDEMPTIONS,
  });

  const [created] = await db
    .insert(accessEntitlements)
    .values({
      orderId: input.order.id,
      userId: input.order.userId,
      paymentRef: input.paymentRef,
      intentId: claims.intent_id,
      resourceId: claims.resource_id,
      policyId: claims.policy_id,
      issuer: claims.iss,
      audience: claims.aud,
      jti: claims.jti,
      grantType: claims.grant_type,
      issuedAt: claims.iat,
      notBefore: claims.nbf,
      expiresAt: claims.exp,
      maxRedemptions: claims.max_redemptions,
    })
    .onConflictDoNothing()
    .returning();

  let entitlement = created;
  if (!entitlement) {
    const [existing] = await db
      .select()
      .from(accessEntitlements)
      .where(
        and(
          eq(accessEntitlements.orderId, input.order.id),
          eq(accessEntitlements.paymentRef, input.paymentRef),
          eq(accessEntitlements.resourceId, PRIVATE_API_RESOURCE_ID),
        ),
      );

    if (!existing) {
      throw new Error("Private API entitlement could not be created or recovered");
    }

    entitlement = existing;
  }

  return { entitlement, receipt: await signEntitlement(entitlement) };
}

export async function getPrivateApiEntitlementForOrder(
  orderId: string,
  userId: string,
  paymentRef: string,
): Promise<AccessEntitlement | undefined> {
  const [entitlement] = await db
    .select()
    .from(accessEntitlements)
    .where(
      and(
        eq(accessEntitlements.orderId, orderId),
        eq(accessEntitlements.userId, userId),
        eq(accessEntitlements.paymentRef, paymentRef),
        eq(accessEntitlements.resourceId, PRIVATE_API_RESOURCE_ID),
      ),
    );

  return entitlement;
}

async function consume(command: Parameters<AccessReceiptStore["consume"]>[0]) {
  const [updated] = await db
    .update(accessEntitlements)
    .set({
      redemptionCount: sql`${accessEntitlements.redemptionCount} + 1`,
      exhausted: sql`${accessEntitlements.redemptionCount} + 1 >= ${accessEntitlements.maxRedemptions}`,
    })
    .where(
      and(
        eq(accessEntitlements.jti, command.jti),
        eq(accessEntitlements.issuer, command.iss),
        eq(accessEntitlements.userId, command.sub),
        eq(accessEntitlements.audience, command.aud),
        eq(accessEntitlements.intentId, command.intent_id),
        eq(accessEntitlements.resourceId, command.resource_id),
        eq(accessEntitlements.policyId, command.policy_id),
        eq(accessEntitlements.grantType, command.grant_type),
        eq(accessEntitlements.maxRedemptions, command.max_redemptions),
        eq(accessEntitlements.expiresAt, command.exp),
        eq(accessEntitlements.revoked, false),
        eq(accessEntitlements.exhausted, false),
        lt(accessEntitlements.redemptionCount, accessEntitlements.maxRedemptions),
        gt(accessEntitlements.expiresAt, command.current_time),
      ),
    )
    .returning({
      redemptionCount: accessEntitlements.redemptionCount,
      maxRedemptions: accessEntitlements.maxRedemptions,
    });

  if (updated) {
    return {
      outcome: "consumed" as const,
      exhausted: updated.redemptionCount >= updated.maxRedemptions,
    };
  }

  const [existing] = await db
    .select()
    .from(accessEntitlements)
    .where(eq(accessEntitlements.jti, command.jti));

  if (!existing) return { outcome: "receipt_missing" as const };

  if (
    existing.issuer !== command.iss ||
    existing.userId !== command.sub ||
    existing.audience !== command.aud ||
    existing.intentId !== command.intent_id ||
    existing.resourceId !== command.resource_id ||
    existing.policyId !== command.policy_id ||
    existing.grantType !== command.grant_type ||
    existing.maxRedemptions !== command.max_redemptions ||
    existing.expiresAt !== command.exp
  ) {
    return { outcome: "authority_mismatch" as const };
  }

  if (existing.revoked) return { outcome: "receipt_revoked" as const };
  if (command.current_time >= existing.expiresAt) {
    return { outcome: "receipt_expired" as const };
  }
  if (existing.exhausted || existing.redemptionCount >= existing.maxRedemptions) {
    return { outcome: "receipt_exhausted" as const };
  }

  return { outcome: "concurrency_conflict" as const };
}

export async function redeemPrivateApiReceiptForOrder(input: {
  token: string;
  subject: string;
  now?: number;
}): Promise<AccessReceiptRedemptionResult> {
  const { verifier } = await getRuntime();
  let claims: AccessReceiptClaims;

  try {
    claims = await verifier(input.token);
  } catch {
    return { status: "verification_denied", phase: "verification" };
  }

  const [entitlement] = await db
    .select()
    .from(accessEntitlements)
    .where(eq(accessEntitlements.jti, claims.jti));

  if (!entitlement) {
    return {
      status: "consumption_denied",
      phase: "consumption",
      reason: "receipt_missing",
    };
  }

  if (entitlement.userId !== input.subject) {
    return { status: "binding_denied", phase: "binding" };
  }

  const store: AccessReceiptStore = { consume };
  return redeemAccessReceipt({
    token: input.token,
    expected: {
      sub: input.subject,
      resource_id: PRIVATE_API_RESOURCE_ID,
      policy_id: PRIVATE_API_POLICY_ID,
      intent_id: entitlement.intentId,
      max_redemptions: entitlement.maxRedemptions,
    },
    verifier: async () => claims,
    store,
    current_time: input.now ?? Math.floor(Date.now() / 1000),
  });
}
