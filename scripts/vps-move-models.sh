#!/usr/bin/env bash
set -euo pipefail
chmod 600 /tmp/oracle_indus
ssh -i /tmp/oracle_indus -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 ubuntu@130.162.60.101 "mkdir -p /opt/rustforge-models-stash && df -h /"
echo START_RSYNC
rsync -avP -e "ssh -i /tmp/oracle_indus -o StrictHostKeyChecking=accept-new" \
  /opt/rustforge/models/*.gguf ubuntu@130.162.60.101:/opt/rustforge-models-stash/
echo RSYNC_DONE
ls -lh /opt/rustforge/models/
ssh -i /tmp/oracle_indus ubuntu@130.162.60.101 "ls -lh /opt/rustforge-models-stash; df -h /"
