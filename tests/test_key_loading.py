from __future__ import annotations

from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from api.lib.env import load_key_material
from app.api.auth import _load_jwt_keys
from app.api.policies import _get_private_key_bytes, _get_public_key_bytes
from app.core.rbac import _load_public_key


def _generate_rsa_pair() -> tuple[bytes, bytes]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


def test_load_key_material_prefers_inline_env(monkeypatch, tmp_path):
    private_pem, _ = _generate_rsa_pair()
    wrong_file = tmp_path / "private.pem"
    wrong_file.write_text("wrong-value", encoding="utf-8")

    monkeypatch.setenv("JWT_PRIVATE_KEY_PEM", private_pem.decode("utf-8"))
    monkeypatch.setenv("JWT_PRIVATE_KEY_PATH", str(wrong_file))

    loaded = load_key_material("JWT_PRIVATE_KEY_PEM", "JWT_PRIVATE_KEY_PATH", "keys/server_private.pem")

    assert loaded == private_pem


def test_load_key_material_falls_back_to_path(monkeypatch, tmp_path):
    private_pem, _ = _generate_rsa_pair()
    pem_file = tmp_path / "private.pem"
    pem_file.write_bytes(private_pem)

    monkeypatch.delenv("JWT_PRIVATE_KEY_PEM", raising=False)
    monkeypatch.setenv("JWT_PRIVATE_KEY_PATH", str(pem_file))

    loaded = load_key_material("JWT_PRIVATE_KEY_PEM", "JWT_PRIVATE_KEY_PATH", "keys/server_private.pem")

    assert loaded == private_pem


def test_auth_and_rbac_key_loaders_support_vercel_pems(monkeypatch):
    private_pem, public_pem = _generate_rsa_pair()

    monkeypatch.setenv("JWT_PRIVATE_KEY_PEM", private_pem.decode("utf-8"))
    monkeypatch.setenv("JWT_PUBLIC_KEY_PEM", public_pem.decode("utf-8"))

    loaded_private, loaded_public = _load_jwt_keys()

    assert loaded_private == private_pem.decode("utf-8")
    assert loaded_public == public_pem.decode("utf-8")
    assert _load_public_key() == public_pem.decode("utf-8")
    assert _get_private_key_bytes() == private_pem
    assert _get_public_key_bytes() == public_pem
