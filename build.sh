#!/bin/bash
cat > firebase-config.js << EOF
window.__DELIPRO_FIREBASE_CFG = {
  apiKey: "${FIREBASE_API_KEY}",
  authDomain: "${FIREBASE_AUTH_DOMAIN}",
  projectId: "${FIREBASE_PROJECT_ID}"
};
EOF
