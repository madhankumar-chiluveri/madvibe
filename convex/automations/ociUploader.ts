"use node";

import { v } from "convex/values";
import crypto from "node:crypto";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

export type OciUploadResult = { publicUrl: string; filename: string; sizeBytes: number };

type OciConfig = {
  namespace: string;
  bucketName: string;
  region: string;
  tenancyOcid: string;
  userOcid: string;
  fingerprint: string;
  privateKeyPem: string;
};

function buildSignature(
  config: OciConfig,
  method: string,
  host: string,
  path: string,
  contentLength: number,
  contentType: string,
  contentSha256: string,
  date: string,
) {
  // Headers included in the OCI signature for object PUT requests
  const signedHeaders = [
    `date: ${date}`,
    `(request-target): ${method.toLowerCase()} ${path}`,
    `host: ${host}`,
    `content-length: ${contentLength}`,
    `content-type: ${contentType}`,
    `x-content-sha256: ${contentSha256}`,
  ].join("\n");

  const headerNames = "date (request-target) host content-length content-type x-content-sha256";

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signedHeaders);
  const signature = signer.sign(config.privateKeyPem, "base64");

  const keyId = `${config.tenancyOcid}/${config.userOcid}/${config.fingerprint}`;
  return {
    headerNames,
    signature,
    keyId,
  };
}

function sha256Base64(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("base64");
}

async function performOciPut(
  config: OciConfig,
  objectName: string,
  bytes: Buffer,
  contentType: string,
) {
  const host = `objectstorage.${config.region}.oraclecloud.com`;
  const encodedObject = encodeURIComponent(objectName).replace(/%2F/g, "%2F");
  const path = `/n/${config.namespace}/b/${config.bucketName}/o/${encodedObject}`;
  const url = `https://${host}${path}`;

  const contentLength = bytes.length;
  const contentSha256 = sha256Base64(bytes);
  const date = new Date().toUTCString();

  const { headerNames, signature, keyId } = buildSignature(
    config,
    "PUT",
    host,
    path,
    contentLength,
    contentType,
    contentSha256,
    date,
  );

  const authorization = `Signature version="1",keyId="${keyId}",algorithm="rsa-sha256",headers="${headerNames}",signature="${signature}"`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      Date: date,
      Host: host,
      "Content-Length": String(contentLength),
      "Content-Type": contentType,
      "x-content-sha256": contentSha256,
    },
    body: new Uint8Array(bytes),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OCI PUT failed: ${response.status} ${response.statusText} — ${errBody}`);
  }

  return url;
}

async function performOciDelete(config: OciConfig, objectName: string) {
  const host = `objectstorage.${config.region}.oraclecloud.com`;
  const encodedObject = encodeURIComponent(objectName).replace(/%2F/g, "%2F");
  const path = `/n/${config.namespace}/b/${config.bucketName}/o/${encodedObject}`;
  const url = `https://${host}${path}`;

  const date = new Date().toUTCString();
  const signedHeaders = [
    `date: ${date}`,
    `(request-target): delete ${path}`,
    `host: ${host}`,
  ].join("\n");
  const headerNames = "date (request-target) host";
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signedHeaders);
  const signature = signer.sign(config.privateKeyPem, "base64");
  const keyId = `${config.tenancyOcid}/${config.userOcid}/${config.fingerprint}`;
  const authorization = `Signature version="1",keyId="${keyId}",algorithm="rsa-sha256",headers="${headerNames}",signature="${signature}"`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: authorization, Date: date, Host: host },
  });

  if (!response.ok && response.status !== 404) {
    const errBody = await response.text();
    throw new Error(`OCI DELETE failed: ${response.status} ${response.statusText} — ${errBody}`);
  }
}

// ── Convex bindings ───────────────────────────────────────────────────────────

export const uploadStorageToOci = action({
  args: {
    workspaceId: v.id("workspaces"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    autoFillPinId: v.optional(v.id("pinManagerPins")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ publicUrl: string; filename: string; sizeBytes: number }> => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    const userId = String(authUserId);

    const { oci } = await ctx.runQuery(internal.automations.uploads._loadConfigAndWorkspace, {
      userId,
      workspaceId: args.workspaceId,
    });
    if (!oci) {
      throw new Error("MISSING_OCI_CONFIG: Configure Oracle OCI in Settings → Integrations first.");
    }

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new Error("Uploaded file no longer exists");
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    const sizeBytes = bytes.byteLength;

    const objectName = `ads/${args.filename}`;
    const publicUrl = await performOciPut(oci, objectName, bytes, args.contentType);

    // Convex storage cleanup — best effort
    try {
      await ctx.storage.delete(args.storageId);
    } catch {
      /* ignore */
    }

    await ctx.runMutation(internal.automations.uploads._recordUploadLog, {
      workspaceId: args.workspaceId,
      userId,
      filename: args.filename,
      publicUrl,
      sizeBytes,
      contentType: args.contentType,
    });

    if (args.autoFillPinId) {
      await ctx.runMutation(internal.automations.pinManager._attachMediaUrlInternal, {
        pinId: args.autoFillPinId,
        mediaUrl: publicUrl,
      });
    }

    return { publicUrl, filename: args.filename, sizeBytes };
  },
});

export const testOciConnection = action({
  args: {},
  handler: async (ctx: any): Promise<{ ok: boolean; message: string }> => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    const userId = String(authUserId);

    const settings: any = await ctx.runQuery(internal.automations.uploads._loadSelfConfig, {
      userId,
    });
    const oci = settings?.oci;
    if (!oci) return { ok: false, message: "No OCI config saved." };

    const testName = `madvibe-test-${Date.now()}.txt`;
    const objectName = `ads/${testName}`;
    const body = Buffer.from(
      `madvibe connection test ${new Date().toISOString()}`,
      "utf8",
    );
    try {
      await performOciPut(oci, objectName, body, "text/plain");
      await performOciDelete(oci, objectName);
      return { ok: true, message: "Connected. Test object uploaded + deleted." };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Unknown error" };
    }
  },
});
