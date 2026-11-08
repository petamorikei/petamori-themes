#!/bin/bash
[ "$(jq -r '.stop_hook_active')" = "true" ] && exit 0

ERRORS=""
BIOME=$(bunx biome check --no-errors-on-unmatched . 2>&1) || ERRORS+="$BIOME"$'\n'
TSC=$(bunx tsc --noEmit 2>&1) || ERRORS+="$TSC"$'\n'

if [ -n "$ERRORS" ]; then
  jq -n --arg reason "$ERRORS" '{"decision":"block","reason":$reason}'
fi
