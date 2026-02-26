/**
 * Cloud storage for generated images (Cloudflare R2 or S3-compatible).
 * When R2 is not configured, returns the source URL as-is (no upload).
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET = process.env.R2_BUCKET ?? "brandbloom-assets";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? ""; // e.g. https://assets.yourdomain.com

function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

/**
 * Upload a buffer (e.g. composite PNG) to R2. Returns public URL or null if not configured.
 */
export async function uploadBufferToStorage(
  buffer: Buffer,
  key: string,
  contentType = "image/png"
): Promise<string | null> {
  if (!isR2Configured()) return null;
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return R2_PUBLIC_URL ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}` : null;
  } catch (e) {
    console.error("R2 upload buffer error:", e);
    return null;
  }
}

/**
 * Upload image from URL to R2 and return public URL.
 * If R2 is not configured, returns the original imageUrl.
 */
export async function uploadImageToStorage(
  imageUrl: string,
  key: string
): Promise<string> {
  if (!isR2Configured()) {
    return imageUrl;
  }
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");
    const buffer = Buffer.from(await response.arrayBuffer());
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: response.headers.get("content-type") ?? "image/png",
      })
    );
    return R2_PUBLIC_URL ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}` : imageUrl;
  } catch (e) {
    console.error("R2 upload error:", e);
    return imageUrl;
  }
}
