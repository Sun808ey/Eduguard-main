from __future__ import annotations

import base64
import json
import os
from typing import Any, Dict


def _b64encode(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def _b64decode(data_b64: str) -> bytes:
    return base64.b64decode(data_b64.encode("ascii"))


def encrypt_policy_bundle(plaintext_json: dict, device_aes_key: bytes) -> dict:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    # FORENSIC ANNOTATION: AES-256-GCM provides authenticated encryption, preventing silent tampering.
    iv = os.urandom(12)
    plaintext_bytes = json.dumps(plaintext_json, separators=(",", ":"), sort_keys=True).encode("utf-8")
    aesgcm = AESGCM(device_aes_key)
    encrypted_blob = aesgcm.encrypt(iv, plaintext_bytes, None)
    ciphertext = encrypted_blob[:-16]
    tag = encrypted_blob[-16:]
    return {
        "ciphertext_b64": _b64encode(ciphertext),
        "iv_b64": _b64encode(iv),
        "tag_b64": _b64encode(tag),
    }


def decrypt_policy_bundle(encrypted: dict, device_aes_key: bytes) -> dict:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    # FORENSIC ANNOTATION: GCM tag verification detects any modification before plaintext is released.
    ciphertext = _b64decode(str(encrypted["ciphertext_b64"]))
    iv = _b64decode(str(encrypted["iv_b64"]))
    tag = _b64decode(str(encrypted["tag_b64"]))
    aesgcm = AESGCM(device_aes_key)
    plaintext_bytes = aesgcm.decrypt(iv, ciphertext + tag, None)
    return json.loads(plaintext_bytes.decode("utf-8"))


def sign_bundle(payload_bytes: bytes, private_key_pem: bytes) -> str:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    # FORENSIC ANNOTATION: RSA-PSS signatures provide non-repudiation and integrity proof for policy bundles.
    private_key = serialization.load_pem_private_key(private_key_pem, password=None)
    signature = private_key.sign(
        payload_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )
    return _b64encode(signature)


def verify_bundle_signature(payload_bytes: bytes, signature_b64: str, public_key_pem: bytes) -> bool:
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    # FORENSIC ANNOTATION: Android agents must verify signatures before applying any policy to the device.
    public_key = serialization.load_pem_public_key(public_key_pem)
    signature = _b64decode(signature_b64)
    try:
        public_key.verify(
            signature,
            payload_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        return True
    except InvalidSignature:
        return False


def generate_device_aes_key() -> bytes:
    # FORENSIC ANNOTATION: os.urandom(32) generates a cryptographically secure per-device AES-256 key.
    return os.urandom(32)


def pack_encrypted_bundle(encrypted_bundle: dict) -> bytes:
    return json.dumps(
        {
            "ciphertext_b64": encrypted_bundle["ciphertext_b64"],
            "tag_b64": encrypted_bundle["tag_b64"],
        },
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def unpack_encrypted_bundle(encrypted_payload: bytes, iv: bytes) -> dict:
    payload = json.loads(encrypted_payload.decode("utf-8"))
    payload["iv_b64"] = _b64encode(iv)
    return payload
