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

for _ in $(seq 1 30); do
	if curl -fsS -o /dev/null http://127.0.0.1:3000/; then
		echo "Deployed $(git rev-parse --short HEAD)"
		exit 0
	fi
	sleep 1
done

echo "App did not respond on :3000 after restart" >&2
journalctl -u niskala-udara -n 50 --no-pager >&2
exit 1
