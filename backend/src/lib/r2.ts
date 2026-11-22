import { AwsClient } from "aws4fetch"
import { IMAGE_CONTENT_TYPES } from "@rendez/schema"

const REGION = "auto"
const SERVICE = "s3"

function awsUriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${(char.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
  )
}

function encodePath(path: string): string {
  return path.split("/").map(awsUriEncode).join("/")
}

function amzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "")
}

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicBaseUrl: string
}

export interface PresignPutParams {
  key: string
  expiresInSeconds: number
  now?: Date
  contentType?: string
  contentLength?: number
}

export interface PresignedUpload {
  url: string
  publicUrl: string
  key: string
  expiresAt: string
  headers: Record<string, string>
}

/**
 * Dựng URL PUT đã ký cho Cloudflare R2 dựa trên thư viện chuẩn `aws4fetch`
 * (thư viện chính thức trong hệ sinh thái Cloudflare Workers / R2 cho AWS SigV4).
 */
export async function presignPut(
  config: R2Config,
  params: PresignPutParams,
): Promise<PresignedUpload> {
  return presignPutAsync(config, params)
}

export async function presignPutAsync(
  config: R2Config,
  params: PresignPutParams,
): Promise<PresignedUpload> {
  const now = params.now ?? new Date()
  const host = `${config.accountId}.r2.cloudflarestorage.com`
  const canonicalUri = encodePath(`/${config.bucket}/${params.key}`)
  const aws = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: SERVICE,
    region: REGION,
  })

  const reqHeaders: Record<string, string> = {}
  if (params.contentType) reqHeaders["Content-Type"] = params.contentType
  if (params.contentLength !== undefined) {
    reqHeaders["Content-Length"] = String(params.contentLength)
  }

  const targetUrl = new URL(`https://${host}${canonicalUri}`)
  targetUrl.searchParams.set("X-Amz-Expires", String(params.expiresInSeconds))

  const signed = await aws.sign(targetUrl.toString(), {
    method: "PUT",
    headers: reqHeaders,
    aws: {
      signQuery: true,
      datetime: amzDate(now),
      allHeaders: true,
    },
  })

  const publicBase = config.publicBaseUrl.replace(/\/$/, "")
  return {
    url: signed.url,
    publicUrl: publicBase ? `${publicBase}/${params.key}` : signed.url.split("?")[0]!,
    key: params.key,
    expiresAt: new Date(now.getTime() + params.expiresInSeconds * 1000).toISOString(),
    headers: reqHeaders,
  }
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

export function extensionForContentType(contentType: string): string | null {
  if (!(IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType)) return null
  return IMAGE_EXTENSIONS[contentType] ?? null
}

export function buildObjectKey(folder: string, userId: string, extension: string): string {
  return `${folder}/${userId}/${crypto.randomUUID()}.${extension}`
}
