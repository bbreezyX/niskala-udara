#!/usr/bin/env bash
# Runs on the VPS as the deploy user (GitHub Actions calls it over SSH through the tailnet).
# Pulls main, rebuilds, restarts the service and waits until it answers.
set -euo pipefail

cd /srv/niskala-udara
git fetch --quiet origin main
git reset --hard origin/main
npm ci --no-audit --no-fund
npm run build
sudo systemctl restart niskala-udara

# Ask the way Caddy does (HTTPS forwarded) and require a 200: a redirect or a proxy error must fail the deploy.
healthy() {
	[ "$(curl -s -o /dev/null -w '%{http_code}' -H 'X-Forwarded-Proto: https' -H 'Host: niskalasense.com' "http://127.0.0.1:3000$1")" = 200 ]
}

for _ in $(seq 1 30); do
	if healthy / && healthy /about && healthy /en; then
		echo "Deployed $(git rev-parse --short HEAD)"
		exit 0
	fi
	sleep 1
done

echo "App did not answer 200 on :3000 after restart" >&2
journalctl -u niskala-udara -n 50 --no-pager >&2
exit 1
