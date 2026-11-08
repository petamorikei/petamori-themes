#!/bin/bash
FILE_PATH=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ] && exit 0
case "$FILE_PATH" in
  *.js|*.ts|*.json) ;;
  *) exit 0 ;;
esac
bunx biome check --write --no-errors-on-unmatched "$FILE_PATH" 2>&1
exit 0
