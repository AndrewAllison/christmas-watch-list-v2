#!/usr/bin/env bash
# Compare (and optionally sync) a local dotenv file with GitHub Actions
# repository / environment secrets and variables.
#
# Usage:
#   ./scripts/sync-gh-env.sh                      # diff .env.local vs production env
#   ./scripts/sync-gh-env.sh --file .env.production
#   ./scripts/sync-gh-env.sh --env production --repo-level
#   ./scripts/sync-gh-env.sh --push-secrets        # upload secret keys from file
#   ./scripts/sync-gh-env.sh --push-variables      # upload variable keys from file
#   ./scripts/sync-gh-env.sh --push-all            # secrets + variables
#   ./scripts/sync-gh-env.sh --dry-run --push-all
#   ./scripts/sync-gh-env.sh --show-values         # compare variable values
#   ./scripts/sync-gh-env.sh --report             # HTML report (local vs prod vs GitHub)
#   ./scripts/sync-gh-env.sh --report --open
#
# Notes:
#   - GitHub never returns secret VALUES — only names. Secret diffs are by name.
#   - Variable VALUES are visible; --show-values compares them.
#   - NEXT_PUBLIC_* keys are treated as variables; everything else as secrets.
#     Override with --all-secrets, --all-variables, or --var-key NAME.
set -euo pipefail

FILE=".env.local"
GH_ENV="production"
REPO_LEVEL=0
PUSH_SECRETS=0
PUSH_VARIABLES=0
SHOW_VALUES=0
DRY_RUN=0
ALL_SECRETS=0
ALL_VARIABLES=0
EXTRA_VAR_KEYS=""
DO_REPORT=0
OPEN_REPORT=0
REPORT_OUT="reports/env-report.html"

usage() {
  sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    -f|--file) FILE="$2"; shift 2 ;;
    -e|--env) GH_ENV="$2"; shift 2 ;;
    --repo-level) REPO_LEVEL=1; shift ;;
    --push-secrets) PUSH_SECRETS=1; shift ;;
    --push-variables) PUSH_VARIABLES=1; shift ;;
    --push-all) PUSH_SECRETS=1; PUSH_VARIABLES=1; shift ;;
    --show-values) SHOW_VALUES=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --all-secrets) ALL_SECRETS=1; shift ;;
    --all-variables) ALL_VARIABLES=1; shift ;;
    --var-key) EXTRA_VAR_KEYS="${EXTRA_VAR_KEYS} $2"; shift 2 ;;
    --report) DO_REPORT=1; shift ;;
    --open) OPEN_REPORT=1; shift ;;
    --report-out) REPORT_OUT="$2"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done

# HTML report mode: local vs production heuristics + GitHub coverage
if [ "$DO_REPORT" -eq 1 ]; then
  SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
  set -- python3 "$SCRIPT_DIR/env-report.py" --gh-env "$GH_ENV" --out "$REPORT_OUT"
  [ "$REPO_LEVEL" -eq 1 ] && set -- "$@" --repo-level
  [ "$OPEN_REPORT" -eq 1 ] && set -- "$@" --open
  exec "$@"
fi

command -v gh >/dev/null || { echo "error: gh CLI required" >&2; exit 1; }
command -v jq >/dev/null || { echo "error: jq required" >&2; exit 1; }
[ -f "$FILE" ] || { echo "error: dotenv file not found: $FILE" >&2; exit 1; }

gh auth status >/dev/null

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
if [ "$REPO_LEVEL" -eq 1 ]; then
  SCOPE_LABEL="repository"
else
  SCOPE_LABEL="environment:$GH_ENV"
fi

echo "Repo:   $REPO"
echo "Scope:  $SCOPE_LABEL"
echo "File:   $FILE"
echo

# Parse dotenv → JSON object { KEY: value } (last occurrence wins)
LOCAL_JSON="$(
  # Prefer python for reliable dotenv parsing on macOS bash 3.2
  python3 - "$FILE" <<'PY'
import json, re, sys
path = sys.argv[1]
env = {}
pat = re.compile(r"^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$")
with open(path, encoding="utf-8") as f:
    for raw in f:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = pat.match(line)
        if not m:
            continue
        key, val = m.group(1), m.group(2)
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        env[key] = val
print(json.dumps(env))
PY
)"

is_variable_key() {
  key="$1"
  if [ "$ALL_SECRETS" -eq 1 ]; then return 1; fi
  if [ "$ALL_VARIABLES" -eq 1 ]; then return 0; fi
  case "$key" in
    NEXT_PUBLIC_*) return 0 ;;
  esac
  for ek in $EXTRA_VAR_KEYS; do
    [ "$key" = "$ek" ] && return 0
  done
  return 1
}

LOCAL_KEYS="$(echo "$LOCAL_JSON" | jq -r 'keys[]')"
SECRET_KEYS_JSON='[]'
VARIABLE_KEYS_JSON='[]'

for key in $LOCAL_KEYS; do
  if is_variable_key "$key"; then
    VARIABLE_KEYS_JSON="$(echo "$VARIABLE_KEYS_JSON" | jq --arg k "$key" '. + [$k]')"
  else
    SECRET_KEYS_JSON="$(echo "$SECRET_KEYS_JSON" | jq --arg k "$key" '. + [$k]')"
  fi
done

if [ "$REPO_LEVEL" -eq 1 ]; then
  REMOTE_SECRET_JSON="$(gh secret list --json name 2>/dev/null || echo '[]')"
  REMOTE_VARIABLE_JSON="$(gh variable list --json name,value 2>/dev/null || echo '[]')"
else
  REMOTE_SECRET_JSON="$(gh secret list --env "$GH_ENV" --json name 2>/dev/null || echo '[]')"
  REMOTE_VARIABLE_JSON="$(gh variable list --env "$GH_ENV" --json name,value 2>/dev/null || echo '[]')"
fi

REMOTE_SECRET_NAMES="$(echo "$REMOTE_SECRET_JSON" | jq -c '[.[].name]')"
REMOTE_VARIABLE_NAMES="$(echo "$REMOTE_VARIABLE_JSON" | jq -c '[.[].name]')"
REMOTE_VARIABLE_MAP="$(echo "$REMOTE_VARIABLE_JSON" | jq -c 'map({key: .name, value: (.value // "")}) | from_entries')"

DIFF="$(jq -n \
  --argjson local "$LOCAL_JSON" \
  --argjson secrets "$SECRET_KEYS_JSON" \
  --argjson variables "$VARIABLE_KEYS_JSON" \
  --argjson remoteSecrets "$REMOTE_SECRET_NAMES" \
  --argjson remoteVariables "$REMOTE_VARIABLE_NAMES" \
  --argjson remoteVarMap "$REMOTE_VARIABLE_MAP" \
  --argjson showValues "$SHOW_VALUES" \
  '
  def sorted: unique | sort;
  {
    secretBoth: ($secrets - ($secrets - $remoteSecrets)) | sorted,
    secretLocalOnly: ($secrets - $remoteSecrets) | sorted,
    secretRemoteOnly: ($remoteSecrets - $secrets - $variables) | sorted,
    varBoth: ($variables - ($variables - $remoteVariables)) | sorted,
    varLocalOnly: ($variables - $remoteVariables) | sorted,
    varRemoteOnly: ($remoteVariables - $variables - $secrets) | sorted,
    misclassified: (
      [ $secrets[] | select(. as $k | $remoteVariables | index($k)) | . + " (local:secret, remote:variable)" ] +
      [ $variables[] | select(. as $k | $remoteSecrets | index($k)) | . + " (local:variable, remote:secret)" ]
    ) | sorted,
    varValueMismatch: (
      if $showValues == 1 then
        [ $variables[]
          | select(. as $k | ($remoteVariables | index($k)))
          | select($local[.] != $remoteVarMap[.])
        ]
      else [] end
    ) | sorted,
    counts: {
      local: ($local | keys | length),
      localSecrets: ($secrets | length),
      localVariables: ($variables | length),
      remoteSecrets: ($remoteSecrets | length),
      remoteVariables: ($remoteVariables | length)
    }
  }
')"

print_list() {
  title="$1"
  json_path="$2"
  echo "== $title =="
  count="$(echo "$DIFF" | jq -r "$json_path | length")"
  if [ "$count" -eq 0 ]; then
    echo "  (none)"
  else
    echo "$DIFF" | jq -r "$json_path[]" | sed 's/^/  - /'
  fi
  echo
}

echo "$DIFF" | jq -r '"Local keys: \(.counts.local)  (secrets: \(.counts.localSecrets), variables: \(.counts.localVariables))\nRemote secrets: \(.counts.remoteSecrets)  |  Remote variables: \(.counts.remoteVariables)\n"'

print_list "Secrets — in both (name match; values cannot be verified)" '.secretBoth'
print_list "Secrets — local only (missing on GitHub)" '.secretLocalOnly'
print_list "Secrets — remote only (not in $FILE)" '.secretRemoteOnly'
print_list "Variables — in both" '.varBoth'
print_list "Variables — local only (missing on GitHub)" '.varLocalOnly'
print_list "Variables — remote only (not in $FILE)" '.varRemoteOnly'
print_list "Classification mismatches" '.misclassified'

if [ "$SHOW_VALUES" -eq 1 ]; then
  print_list "Variables — value mismatches" '.varValueMismatch'
fi

write_dotenv_subset() {
  # Write selected keys from LOCAL_JSON into a tempfile; print path.
  keys_json="$1"
  tmp="$(mktemp)"
  python3 - "$tmp" "$LOCAL_JSON" "$keys_json" <<'PY'
import json, sys
path, local, keys = sys.argv[1], json.loads(sys.argv[2]), json.loads(sys.argv[3])
with open(path, "w", encoding="utf-8") as out:
    for key in keys:
        val = local.get(key, "")
        if any(c in val for c in ' \t\n"\'#') or val == "":
            esc = val.replace("\\", "\\\\").replace('"', '\\"')
            out.write(f'{key}="{esc}"\n')
        else:
            out.write(f"{key}={val}\n")
PY
  printf '%s' "$tmp"
}

push_secrets() {
  keys="$(echo "$SECRET_KEYS_JSON")"
  count="$(echo "$keys" | jq 'length')"
  [ "$count" -gt 0 ] || { echo "No secrets to push."; return; }

  tmp="$(write_dotenv_subset "$keys")"
  set -- secret set -f "$tmp"
  [ "$REPO_LEVEL" -eq 1 ] || set -- "$@" --env "$GH_ENV"

  echo "Pushing $count secret(s) to $SCOPE_LABEL..."
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] gh $*"
    cut -d= -f1 "$tmp" | sed 's/^/  /'
  else
    gh "$@"
    echo "Done."
  fi
  rm -f "$tmp"
}

push_variables() {
  keys="$(echo "$VARIABLE_KEYS_JSON")"
  count="$(echo "$keys" | jq 'length')"
  [ "$count" -gt 0 ] || { echo "No variables to push."; return; }

  tmp="$(write_dotenv_subset "$keys")"
  set -- variable set -f "$tmp"
  [ "$REPO_LEVEL" -eq 1 ] || set -- "$@" --env "$GH_ENV"

  echo "Pushing $count variable(s) to $SCOPE_LABEL..."
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] gh $*"
    cut -d= -f1 "$tmp" | sed 's/^/  /'
  else
    gh "$@"
    echo "Done."
  fi
  rm -f "$tmp"
}

if [ "$PUSH_SECRETS" -eq 1 ]; then
  push_secrets
  echo
fi

if [ "$PUSH_VARIABLES" -eq 1 ]; then
  push_variables
  echo
fi

if [ "$PUSH_SECRETS" -eq 0 ] && [ "$PUSH_VARIABLES" -eq 0 ]; then
  echo "Tip: re-run with --push-secrets / --push-variables / --push-all to upload from $FILE."
  echo "     Add --dry-run to preview. Use --show-values to compare variable values."
fi
