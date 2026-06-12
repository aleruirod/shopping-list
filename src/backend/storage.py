import base64
import io
import mimetypes
import os
import re
import uuid

import boto3
from botocore.exceptions import BotoCoreError, ClientError

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID") or os.getenv("RAILWAY_STORAGE_ACCESS_KEY") or os.getenv("STORAGE_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY") or os.getenv("RAILWAY_STORAGE_SECRET_KEY") or os.getenv("STORAGE_SECRET_KEY")
AWS_REGION = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or os.getenv("RAILWAY_STORAGE_REGION")
BUCKET_NAME = (
    os.getenv("AWS_BUCKET")
    or os.getenv("S3_BUCKET")
    or os.getenv("BUCKET_NAME")
    or os.getenv("RAILWAY_STORAGE_BUCKET")
    or os.getenv("RAILWAY_BUCKET_NAME")
)
S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT") or os.getenv("S3_ENDPOINT") or os.getenv("RAILWAY_STORAGE_ENDPOINT")


def _is_configured():
    return bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and BUCKET_NAME)


def _get_s3_client():
    if not _is_configured():
        return None

    client_kwargs = {
        "aws_access_key_id": AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
    }
    if AWS_REGION:
        client_kwargs["region_name"] = AWS_REGION
    if S3_ENDPOINT_URL:
        client_kwargs["endpoint_url"] = S3_ENDPOINT_URL

    return boto3.client("s3", **client_kwargs)


def _guess_extension(content_type: str | None):
    if not content_type:
        return ".png"
    ext = mimetypes.guess_extension(content_type)
    if ext:
        return ext
    if content_type == "image/jpeg":
        return ".jpg"
    if content_type == "image/png":
        return ".png"
    return ".png"


def upload_photo_bytes(data: bytes, content_type: str | None = None) -> str:
    s3 = _get_s3_client()
    if not s3:
        raise RuntimeError("S3 storage is not configured")

    ext = _guess_extension(content_type)
    key = f"photos/{uuid.uuid4().hex}{ext}"
    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=content_type or "image/png",
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError(f"Failed to upload photo: {exc}") from exc

    return key


def upload_data_url(data_url: str) -> str:
    match = re.match(r"data:(image/[^;]+);base64,(.+)", data_url)
    if not match:
        raise ValueError("Invalid data URL")

    content_type, encoded = match.groups()
    data = base64.b64decode(encoded)
    return upload_photo_bytes(data, content_type=content_type)


def get_photo_bytes(photo_key: str) -> tuple[bytes, str] | None:
    s3 = _get_s3_client()
    if not s3:
        return None

    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=photo_key)
        body = response["Body"].read()
        content_type = response.get("ContentType", "image/jpeg")
        return body, content_type
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code in {"NoSuchKey", "NoSuchBucket", "404"}:
            return None
        raise


def list_photo_keys(prefix: str = "photos/") -> list[str]:
    s3 = _get_s3_client()
    if not s3:
        return []

    keys = []
    continuation_token = None
    while True:
        params = {
            "Bucket": BUCKET_NAME,
            "Prefix": prefix,
        }
        if continuation_token:
            params["ContinuationToken"] = continuation_token
        response = s3.list_objects_v2(**params)
        for item in response.get("Contents", []):
            keys.append(item["Key"])
        if not response.get("IsTruncated"):
            break
        continuation_token = response.get("NextContinuationToken")
    return keys


def is_storage_configured() -> bool:
    return _is_configured()
