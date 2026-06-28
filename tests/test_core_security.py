from __future__ import annotations

import base64
import hashlib
import importlib
import json
import hmac
import sys
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from flask import Flask, jsonify


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


def _bootstrap_imports(monkeypatch, tmp_path):
    root_dir = Path(__file__).resolve().parents[1]
    api_dir = root_dir / "api"
    for path in (str(api_dir), str(root_dir)):
        if path not in sys.path:
            sys.path.insert(0, path)

    db_path = tmp_path / "eduguard.db"
    monkeypatch.setenv("DATABASE_URL", str(db_path))

    private_pem, public_pem = _generate_rsa_pair()
    monkeypatch.setenv("JWT_PRIVATE_KEY_PEM", private_pem.decode("utf-8"))
    monkeypatch.setenv("JWT_PUBLIC_KEY_PEM", public_pem.decode("utf-8"))
    monkeypatch.setenv("FLASK_SECRET_KEY", "test-secret")
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret")

    modules = {
        "connection": importlib.import_module("app.db.connection"),
        "migrations": importlib.import_module("app.db.migrations"),
        "crypto": importlib.import_module("app.core.crypto"),
        "audit_chain": importlib.import_module("app.core.audit_chain"),
        "rbac": importlib.import_module("app.core.rbac"),
        "sync_engine": importlib.import_module("app.core.sync_engine"),
        "config": importlib.import_module("app.core.config"),
        "auth": importlib.import_module("app.api.auth"),
        "policies": importlib.import_module("app.api.policies"),
    }

    return modules, db_path, private_pem, public_pem


def _prepare_schema(migrations, connection):
    migrations.run_migrations(connection)


def _seed_user(connection, password: str = "StrongPass!123", role: str = "SUPER_ADMIN") -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO users (username, password_hash, role, created_at, is_active) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)",
            ("admin", bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8"), role),
        )
    return int(cursor.lastrowid)


def _seed_device(connection, private_pem: bytes, public_pem: bytes) -> int:
    from app.core.crypto import generate_device_aes_key

    device_key = generate_device_aes_key()
    with connection:
        cursor = connection.execute(
            """
            INSERT INTO devices (device_name, android_id, device_key_enc, public_key, enrolled_at, last_sync_at, is_revoked)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 0)
            """,
            (
                "School Phone 01",
                "android-001",
                device_key,
                public_pem.decode("utf-8"),
                "2026-06-28T08:00:00Z",
            ),
        )
    return int(cursor.lastrowid)


def test_crypto_roundtrip_and_signature(monkeypatch, tmp_path):
    modules, _, private_pem, public_pem = _bootstrap_imports(monkeypatch, tmp_path)
    crypto = modules["crypto"]

    device_key = crypto.generate_device_aes_key()
    payload = {"policy": "exam kiosk", "version": 1}
    encrypted = crypto.encrypt_policy_bundle(payload, device_key)
    decrypted = crypto.decrypt_policy_bundle(encrypted, device_key)

    signed_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    signature = crypto.sign_bundle(signed_bytes, private_pem)

    assert decrypted == payload
    assert crypto.verify_bundle_signature(signed_bytes, signature, public_pem)
    assert not crypto.verify_bundle_signature(signed_bytes + b"x", signature, public_pem)


def test_audit_chain_append_and_verify(monkeypatch, tmp_path):
    modules, _, _, _ = _bootstrap_imports(monkeypatch, tmp_path)
    connection_mod = modules["connection"]
    migrations = modules["migrations"]
    audit_chain = modules["audit_chain"]
    crypto = modules["crypto"]

    connection = connection_mod.get_connection(str(tmp_path / "audit.db"))
    try:
        _prepare_schema(migrations, connection)
        user_id = _seed_user(connection)
        device_cursor = connection.execute(
            """
            INSERT INTO devices (device_name, android_id, device_key_enc, public_key, enrolled_at, last_sync_at, is_revoked)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 0)
            """,
            (
                "School Phone 01",
                "android-audit-001",
                crypto.generate_device_aes_key(),
                "audit-public-key",
                "2026-06-28T08:00:00Z",
            ),
        )
        device_id = int(device_cursor.lastrowid)
        audit_chain.append_event(
            connection,
            event_type="POLICY_CREATED",
            device_id=str(device_id),
            user_id=str(user_id),
            payload={"policy_id": 10, "title": "exam kiosk"},
        )
        audit_chain.append_event(
            connection,
            event_type="POLICY_ASSIGNED",
            device_id=str(device_id),
            user_id=str(user_id),
            payload={"policy_id": 10, "device_id": 1},
        )

        report = audit_chain.verify_chain(connection)
        assert report["valid"] is True
        assert report["total"] == 2
        assert report["first_broken_id"] is None
    finally:
        connection.close()


def test_rbac_enforces_role_hierarchy(monkeypatch, tmp_path):
    modules, _, private_pem, public_pem = _bootstrap_imports(monkeypatch, tmp_path)
    connection_mod = modules["connection"]
    migrations = modules["migrations"]
    rbac = modules["rbac"]

    connection = connection_mod.get_connection(str(tmp_path / "rbac.db"))
    _prepare_schema(migrations, connection)
    user_id = _seed_user(connection, role="ICT_TEACHER")
    connection.close()

    monkeypatch.setattr(rbac, "get_connection", lambda: connection_mod.get_connection(str(tmp_path / "rbac.db")))

    token = jwt.encode(
        {
            "sub": str(user_id),
            "role": "ICT_TEACHER",
            "type": "access",
            "iat": int(datetime.now(timezone.utc).timestamp()),
            "exp": int(datetime.now(timezone.utc).timestamp()) + 300,
            "jti": "test-jti",
        },
        private_pem.decode("utf-8"),
        algorithm="RS256",
    )

    app = Flask(__name__)

    @app.get("/secure")
    @rbac.require_role("CLASS_TEACHER")
    def secure_route():
        return jsonify({"ok": True})

    client = app.test_client()
    response = client.get("/secure", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.get_json()["ok"] is True


def test_sync_engine_pull_and_push(monkeypatch, tmp_path):
    modules, _, private_pem, public_pem = _bootstrap_imports(monkeypatch, tmp_path)
    connection_mod = modules["connection"]
    migrations = modules["migrations"]
    crypto = modules["crypto"]
    sync_engine = modules["sync_engine"]

    connection = connection_mod.get_connection(str(tmp_path / "sync.db"))
    try:
        _prepare_schema(migrations, connection)
        user_id = _seed_user(connection)
        device_id = _seed_device(connection, private_pem, public_pem)
        connection.close()

        monkeypatch.setattr(sync_engine, "get_connection", lambda: connection_mod.get_connection(str(tmp_path / "sync.db")))

        validation_connection = connection_mod.get_connection(str(tmp_path / "sync.db"))
        try:
            device_key_row = validation_connection.execute("SELECT device_key_enc FROM devices WHERE id = ?", (device_id,)).fetchone()
            device_key = device_key_row["device_key_enc"]

            payload_json = {"policy": "exam kiosk", "version": 1}
            encrypted = crypto.encrypt_policy_bundle(payload_json, device_key)
            packed = crypto.pack_encrypted_bundle(encrypted)
            iv = base64.b64decode(encrypted["iv_b64"].encode("ascii"))
            signature = crypto.sign_bundle(packed + iv, private_pem)

            policy_cursor = validation_connection.execute(
                """
                INSERT INTO policy_bundles (title, version, encrypted_payload, signature, iv, created_by, created_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
                """,
                ("exam kiosk", 1, packed, base64.b64decode(signature.encode("ascii")), iv, user_id),
            )
            policy_id = int(policy_cursor.lastrowid)
            validation_connection.execute(
                "INSERT INTO policy_assignments (device_id, policy_id, assigned_at, assigned_by) VALUES (?, ?, CURRENT_TIMESTAMP, ?)",
                (device_id, policy_id, user_id),
            )
            validation_connection.commit()
        finally:
            validation_connection.close()

        # Pull path
        last_sync_at = "2026-06-27T08:00:00Z"
        canonical_pull = {
            "device_id": device_id,
            "last_sync_at": last_sync_at,
            "path": "/api/sync/pull",
            "method": "GET",
        }
        device_connection = connection_mod.get_connection(str(tmp_path / "sync.db"))
        try:
            device_row = device_connection.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
            device_key = device_row["device_key_enc"]
            bad_sig = hashlib.sha256(device_key + b"pull").hexdigest()
            assert sync_engine.verify_sync_signature(device_row, canonical_pull, bad_sig) is False

            proper_pull_sig = hmac.new(device_key, json.dumps(canonical_pull, separators=(",", ":"), sort_keys=True).encode("utf-8"), hashlib.sha256).hexdigest()
            pull_response, pull_status = sync_engine.build_pull_response(device_id, last_sync_at, proper_pull_sig)
        finally:
            device_connection.close()

        assert pull_status == 200
        assert pull_response["has_update"] is True
        assert pull_response["policy_version"] == 1

        # Push path
        events = [{"event_type": "DEVICE_EVENT", "value": "policy_applied"}]
        push_canonical = {"device_id": device_id, "events": events}
        push_sig = hmac.new(device_key, json.dumps(push_canonical, separators=(",", ":"), sort_keys=True).encode("utf-8"), hashlib.sha256).hexdigest()
        push_response, push_status = sync_engine.process_push_payload({"device_id": device_id, "events": events}, push_sig)
        assert push_status == 200
        assert push_response["accepted"] == 1

        audit_connection = connection_mod.get_connection(str(tmp_path / "sync.db"))
        try:
            report = modules["audit_chain"].verify_chain(audit_connection)
        finally:
            audit_connection.close()
        assert report["valid"] is True
    finally:
        connection.close()


def test_settings_defaults(monkeypatch):
    modules, _, _, _ = _bootstrap_imports(monkeypatch, Path.cwd())
    config = modules["config"]

    monkeypatch.delenv("FLASK_SECRET_KEY", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)

    settings = config.load_settings()

    assert settings.secret_key == "dev-bootstrap-secret"
    assert settings.jwt_secret == ""
    assert settings.database_url == ""
    assert settings.vercel_env == "development"