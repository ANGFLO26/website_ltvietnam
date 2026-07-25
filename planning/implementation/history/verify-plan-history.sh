#!/usr/bin/env bash
set -euo pipefail

SOURCE_COMMIT="9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd"
SOURCE_PATHS=(
  "planning/implementation/v0.1"
  "planning/implementation/v0.2"
  "planning/implementation/v0.3"
  "planning/implementation/v0.4"
  "planning/implementation/v0.4.1"
)

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
MANIFEST="$SCRIPT_DIR/PLAN_HISTORY_MANIFEST.sha256"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Manifest is missing: $MANIFEST" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ltvn-plan-history.XXXXXXXX")"
cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

ARCHIVE="$TMP_DIR/plan-history.tar"
EXTRACT_ROOT="$TMP_DIR/extract"
EXPECTED="$TMP_DIR/expected.sha256"
EXPECTED_PATHS="$TMP_DIR/expected.paths"
SORTED_EXPECTED_PATHS="$TMP_DIR/expected.sorted.paths"
ACTUAL="$TMP_DIR/actual.sha256"
DUPLICATES="$TMP_DIR/duplicates.txt"

mkdir -p -- "$EXTRACT_ROOT"

if grep -Ev '^([0-9a-f]{64}  .+|[[:space:]]*)$' "$MANIFEST" | grep -q .; then
  echo "Manifest contains malformed lines" >&2
  exit 1
fi

grep -E '^[0-9a-f]{64}  .+$' "$MANIFEST" > "$EXPECTED"
if [[ ! -s "$EXPECTED" ]]; then
  echo "Manifest has no entries" >&2
  exit 1
fi

sed -E 's/^[0-9a-f]{64}  //' "$EXPECTED" > "$EXPECTED_PATHS"
LC_ALL=C sort "$EXPECTED_PATHS" > "$SORTED_EXPECTED_PATHS"
if ! cmp -s "$EXPECTED_PATHS" "$SORTED_EXPECTED_PATHS"; then
  echo "Manifest is not in stable lexicographic order" >&2
  exit 1
fi

LC_ALL=C sort "$EXPECTED_PATHS" | uniq -d > "$DUPLICATES"
if [[ -s "$DUPLICATES" ]]; then
  echo "Manifest contains duplicate paths:" >&2
  cat "$DUPLICATES" >&2
  exit 1
fi

while IFS= read -r line; do
  path="${line:66}"
  allowed=false
  for source_path in "${SOURCE_PATHS[@]}"; do
    if [[ "$path" == "$source_path/"* ]]; then
      allowed=true
      break
    fi
  done
  if [[ "$allowed" != true ]]; then
    echo "Manifest path is outside the allowed history directories: $path" >&2
    exit 1
  fi
done < "$EXPECTED"

git -C "$REPO_ROOT" archive \
  --format=tar \
  --output="$ARCHIVE" \
  "$SOURCE_COMMIT" \
  -- "${SOURCE_PATHS[@]}"

tar -xf "$ARCHIVE" -C "$EXTRACT_ROOT"

EXTRACTED_DIRS=()
for source_path in "${SOURCE_PATHS[@]}"; do
  extracted_dir="$EXTRACT_ROOT/$source_path"
  if [[ ! -d "$extracted_dir" ]]; then
    echo "Archived history directory is missing: $source_path" >&2
    exit 1
  fi
  EXTRACTED_DIRS+=("$extracted_dir")
done

: > "$ACTUAL"
while IFS= read -r -d '' file; do
  relative_path="${file#"$EXTRACT_ROOT"/}"
  hash="$(sha256sum "$file" | awk '{print $1}')"
  printf '%s  %s\n' "$hash" "$relative_path" >> "$ACTUAL"
done < <(find "${EXTRACTED_DIRS[@]}" -type f -print0 | LC_ALL=C sort -z)

if ! diff -u "$EXPECTED" "$ACTUAL"; then
  echo "Plan-history manifest verification failed" >&2
  exit 1
fi

manifest_count="$(wc -l < "$EXPECTED" | tr -d '[:space:]')"
archive_count="$(wc -l < "$ACTUAL" | tr -d '[:space:]')"

echo "PLAN_HISTORY_VERIFICATION=PASS"
echo "source_commit=$SOURCE_COMMIT"
echo "manifest_entries=$manifest_count"
echo "archive_files=$archive_count"
