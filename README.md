# EduGuard Backend

## Prerequisites
	- Python 3.9+, pip, openssl, git
	- laptop
	- VS Code + Python extension

## Installation (6 steps)
	1. git clone + cd eduguard-backend
	2. python -m venv venv && source venv/bin/activate
	3. pip install -r requirements.txt
	4. cp .env.example .env && (explain each variable)
	5. python scripts/generate_keys.py       # RSA keypair
	6. bash scripts/gen_ssl_cert.sh          # self-signed TLS

## Database Initialisation
	python scripts/init_db.py               # creates tables + seeds SUPER_ADMIN

## Running the Server
	Dev:        python run.py
	Production: gunicorn -w 4 -b 0.0.0.0:5000 --certfile=certs/server.crt --keyfile=certs/server.key run:app

## First-Run Checklist
	[ ] .env contains no placeholder values
	[ ] keys/ contains server_private.pem + server_public.pem
	[ ] certs/ contains server.crt + server.key  
	[ ] data/eduguard.db exists and has all 7 tables
	[ ] curl https://localhost:5000/api/health returns {"status":"ok"}

## Forensic Verification
	python scripts/verify_audit_chain.py    # verify hash chain integrity
	Expected: CHAIN INTACT (N entries verified)
  
	To simulate tamper detection:
		1. Open DB: sqlite3 data/eduguard.db
		2. UPDATE audit_log SET payload_json='{"tampered":true}' WHERE id=1;
		3. python scripts/verify_audit_chain.py
		Expected: CHAIN BROKEN at entry ID 1 — proves tamper evidence works