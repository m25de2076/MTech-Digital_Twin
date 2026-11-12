#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
if ! command -v mkcert >/dev/null 2>&1; then
  echo 'Install mkcert first: brew install mkcert'
  exit 1
fi
if [ "$#" -ne 1 ] || [[ ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo 'Usage: bash setup_phone_ar.sh YOUR_MAC_WIFI_IP'
  exit 1
fi
mkdir -p "$ROOT_DIR/frontend/certs"
mkcert -install
mkcert -cert-file "$ROOT_DIR/frontend/certs/phone.pem" -key-file "$ROOT_DIR/frontend/certs/phone-key.pem" localhost 127.0.0.1 ::1 "$1"
echo "Open https://$1:5173 on the phone after trusting rootCA.pem as described in PHONE_AR.md."
echo 'Start frontend: cd frontend && PHONE_AR_HTTPS=1 npm run dev'
echo "Public root certificate: $(mkcert -CAROOT)/rootCA.pem"
echo 'Do not copy or share rootCA-key.pem or phone-key.pem.'
