#!/bin/sh
set -eu
cat <<EOF >/usr/share/nginx/html/env-config.js
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL:-http://localhost:8080/api/v1}"
};
EOF
