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
MANIFEST="${1:-$SCRIPT_DIR/PLAN_HISTORY_MANIFEST.sha256}"

git -C "$REPO_ROOT" cat-file -e "$SOURCE_COMMIT^{commit}"
if [[ ! -f "$MANIFEST" ]]; then
  echo "Manifest is missing: $MANIFEST" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ltvn-plan-history.XXXXXXXX")"
cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

TREE_FILE="$TMP_DIR/tree.z"
TREE_PATHS="$TMP_DIR/tree.paths"
TREE_PATHS_SORTED="$TMP_DIR/tree.paths.sorted"
ACTUAL_PAIRS="$TMP_DIR/actual.pairs"
ACTUAL_PAIRS_SORTED="$TMP_DIR/actual.pairs.sorted"
ACTUAL_MANIFEST="$TMP_DIR/actual.sha256"
EXPECTED_MANIFEST="$TMP_DIR/expected.sha256"
EXPECTED_PATHS="$TMP_DIR/expected.paths"
EXPECTED_PATHS_SORTED="$TMP_DIR/expected.paths.sorted"
DUPLICATES="$TMP_DIR/duplicates.txt"
MALFORMED="$TMP_DIR/malformed.txt"

git -C "$REPO_ROOT" ls-tree -r -z --full-tree \
  "$SOURCE_COMMIT" \
  -- "${SOURCE_PATHS[@]}" > "$TREE_FILE"

: > "$TREE_PATHS"
: > "$ACTUAL_PAIRS"
declare -A seen_tree_paths=()
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
  if [[ -n "${seen_tree_paths[$path]+set}" ]]; then
    echo "Duplicate tree path: $path" >&2
    exit 1
  fi
  seen_tree_paths["$path"]=1

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
  printf '%s\n' "$path" >> "$TREE_PATHS"
  printf '%s\t%s\n' "$path" "$hash" >> "$ACTUAL_PAIRS"
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

LC_ALL=C sort "$TREE_PATHS" > "$TREE_PATHS_SORTED"
LC_ALL=C sort -t $'\t' -k1,1 "$ACTUAL_PAIRS" > "$ACTUAL_PAIRS_SORTED"
: > "$ACTUAL_MANIFEST"
while IFS=$'\t' read -r path hash; do
  printf '%s  %s\n' "$hash" "$path" >> "$ACTUAL_MANIFEST"
done < "$ACTUAL_PAIRS_SORTED"

if grep -Ev '^([0-9a-f]{64}  .+)$' "$MANIFEST" > "$MALFORMED"; then
  if [[ -s "$MALFORMED" ]]; then
    echo "Manifest contains malformed lines:" >&2
    cat "$MALFORMED" >&2
    exit 1
  fi
fi

grep -E '^[0-9a-f]{64}  .+$' "$MANIFEST" > "$EXPECTED_MANIFEST"
if [[ ! -s "$EXPECTED_MANIFEST" ]]; then
  echo "Manifest has no entries" >&2
  exit 1
fi

sed -E 's/^[0-9a-f]{64}  //' "$EXPECTED_MANIFEST" > "$EXPECTED_PATHS"
LC_ALL=C sort "$EXPECTED_PATHS" > "$EXPECTED_PATHS_SORTED"
if ! cmp -s "$EXPECTED_PATHS" "$EXPECTED_PATHS_SORTED"; then
  echo "Manifest is not in stable bytewise lexicographic path order" >&2
  exit 1
fi

LC_ALL=C sort "$EXPECTED_PATHS" | uniq -d > "$DUPLICATES"
if [[ -s "$DUPLICATES" ]]; then
  echo "Manifest contains duplicate paths:" >&2
  cat "$DUPLICATES" >&2
  exit 1
fi

while IFS= read -r path; do
  case "$path" in
    planning/implementation/v0.1/*|\
    planning/implementation/v0.2/*|\
    planning/implementation/v0.3/*|\
    planning/implementation/v0.4/*|\
    planning/implementation/v0.4.1/*) ;;
    *)
      echo "Manifest path outside allowed history directories: $path" >&2
      exit 1
      ;;
  esac
done < "$EXPECTED_PATHS"

missing_count="$(comm -23 "$TREE_PATHS_SORTED" "$EXPECTED_PATHS_SORTED" | wc -l | tr -d '[:space:]')"
extra_count="$(comm -13 "$TREE_PATHS_SORTED" "$EXPECTED_PATHS_SORTED" | wc -l | tr -d '[:space:]')"

if ! diff -u "$EXPECTED_MANIFEST" "$ACTUAL_MANIFEST"; then
  echo "Plan-history exact-blob manifest verification failed" >&2
  echo "missing=$missing_count extra=$extra_count" >&2
  exit 1
fi

manifest_count="$(wc -l < "$EXPECTED_MANIFEST" | tr -d '[:space:]')"
echo "PLAN_HISTORY_VERIFICATION=PASS"
echo "source_commit=$SOURCE_COMMIT"
echo "hash_basis=git-cat-file-blob"
echo "manifest_entries=$manifest_count"
echo "tree_paths=$total"
echo "missing=0"
echo "extra=0"
echo "duplicate=0"
echo "mismatch=0"
