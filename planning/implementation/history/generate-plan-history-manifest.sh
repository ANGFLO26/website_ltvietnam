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
OUTPUT_PATH="${1:-$SCRIPT_DIR/PLAN_HISTORY_MANIFEST.sha256}"
OUTPUT_DIRECTORY="$(cd -- "$(dirname -- "$OUTPUT_PATH")" && pwd)"
OUTPUT_PATH="$OUTPUT_DIRECTORY/$(basename -- "$OUTPUT_PATH")"

git -C "$REPO_ROOT" cat-file -e "$SOURCE_COMMIT^{commit}"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ltvn-plan-history-generator.XXXXXXXX")"
cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

TREE_FILE="$TMP_DIR/tree.z"
PAIRS="$TMP_DIR/pairs.txt"
PAIRS_SORTED="$TMP_DIR/pairs.sorted.txt"
GENERATED="$TMP_DIR/PLAN_HISTORY_MANIFEST.sha256"

git -C "$REPO_ROOT" ls-tree -r -z --full-tree \
  "$SOURCE_COMMIT" \
  -- "${SOURCE_PATHS[@]}" > "$TREE_FILE"

: > "$PAIRS"
declare -A seen_paths=()
total=0
count_v01=0
count_v02=0
count_v03=0
count_v04=0
count_v041=0

while IFS= read -r -d '' record; do
  if [[ "$record" != *$'\t'* ]]; then
    echo "Malformed git ls-tree record without tab separator" >&2
    exit 1
  fi
  metadata="${record%%$'\t'*}"
  path="${record#*$'\t'}"
  IFS=' ' read -r mode type blob_oid extra_metadata <<< "$metadata"

  if [[ -n "${extra_metadata:-}" || ! "$mode" =~ ^[0-7]{6}$ ]]; then
    echo "Malformed git ls-tree metadata: $metadata" >&2
    exit 1
  fi
  if [[ "$type" != "blob" ]]; then
    echo "Non-blob tree entry rejected: mode=$mode type=$type oid=$blob_oid path=$path" >&2
    exit 1
  fi
  if [[ ! "$blob_oid" =~ ^([0-9a-f]{40}|[0-9a-f]{64})$ ]]; then
    echo "Malformed blob OID for $path: $blob_oid" >&2
    exit 1
  fi
  if [[ "$path" == *$'\n'* || "$path" == *$'\r'* || "$path" == *$'\t'* ]]; then
    echo "Manifest-incompatible path rejected: $path" >&2
    exit 1
  fi
  if [[ -n "${seen_paths[$path]+set}" ]]; then
    echo "Duplicate tree path: $path" >&2
    exit 1
  fi
  seen_paths["$path"]=1

  case "$path" in
    planning/implementation/v0.1/*) ((count_v01 += 1)) ;;
    planning/implementation/v0.2/*) ((count_v02 += 1)) ;;
    planning/implementation/v0.3/*) ((count_v03 += 1)) ;;
    planning/implementation/v0.4.1/*) ((count_v041 += 1)) ;;
    planning/implementation/v0.4/*) ((count_v04 += 1)) ;;
    *)
      echo "Tree path outside allowed history directories: $path" >&2
      exit 1
      ;;
  esac

  hash="$(git -C "$REPO_ROOT" cat-file blob "$blob_oid" | sha256sum | awk '{print $1}')"
  printf '%s\t%s\n' "$path" "$hash" >> "$PAIRS"
  ((total += 1))
done < "$TREE_FILE"

if [[ "$total" -ne 80 ||
      "$count_v01" -ne 12 ||
      "$count_v02" -ne 15 ||
      "$count_v03" -ne 16 ||
      "$count_v04" -ne 18 ||
      "$count_v041" -ne 19 ]]; then
  echo "Unexpected source inventory: total=$total v0.1=$count_v01 v0.2=$count_v02 v0.3=$count_v03 v0.4=$count_v04 v0.4.1=$count_v041" >&2
  exit 1
fi

LC_ALL=C sort -t $'\t' -k1,1 "$PAIRS" > "$PAIRS_SORTED"
: > "$GENERATED"
while IFS=$'\t' read -r path hash; do
  printf '%s  %s\n' "$hash" "$path" >> "$GENERATED"
done < "$PAIRS_SORTED"

mv -f -- "$GENERATED" "$OUTPUT_PATH"
echo "PLAN_HISTORY_MANIFEST_GENERATION=PASS"
echo "source_commit=$SOURCE_COMMIT"
echo "hash_basis=git-cat-file-blob"
echo "tree_paths=$total"
echo "manifest_entries=$total"
echo "output=$OUTPUT_PATH"
