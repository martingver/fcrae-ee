#!/usr/bin/env bash
set -euo pipefail
: "${DEPLOY_HOST:?Missing DEPLOY_HOST}"
: "${DEPLOY_USER:?Missing DEPLOY_USER}"
deploy_key="${DEPLOY_KEY_PATH:-$HOME/.ssh/deploy_key}"
deploy_target="$DEPLOY_USER@$DEPLOY_HOST"

# Public files and the private form service use the same release/configuration.
rsync -az --delete \
  --exclude '.git*' --exclude '.env*' --exclude '.well-known' \
  --exclude 'node_modules' --exclude 'output' --exclude 'concepts' \
  --exclude '*.sqlite*' --exclude 'api' --exclude 'scripts' \
  --exclude 'README.md' --exclude 'package.json' \
  -e "ssh -i $deploy_key" ./ "$deploy_target:/var/www/html/"

rsync -azR -e "ssh -i $deploy_key" \
  api/forms/contact.mjs scripts/forms-server.mjs data/supporters.json \
  "$deploy_target:/opt/fcrae-forms/"

ssh -i "$deploy_key" "$deploy_target" \
  'sudo -n /usr/bin/systemctl restart fcrae-forms && systemctl is-active --quiet fcrae-forms && curl --retry 5 --retry-delay 1 --retry-connrefused -fsS http://127.0.0.1:4174/health'
