#!/usr/bin/env python3
"""Compare .env.local / .env.production with GitHub env secrets/vars and write an HTML report.

Checks:
  - Key presence across local, production, and GitHub
  - .env.local URL-ish values should prefer localhost / local hosts
  - .env.production should not use localhost / local hosts
  - Shared keys: value match vs expected divergence (e.g. DATABASE_URL)
  - Empty values, classification (secret vs variable)

Usage:
  ./scripts/env-report.py
  ./scripts/env-report.py --local .env.local --production .env.production \\
      --gh-env production --out reports/env-report.html
  ./scripts/env-report.py --open
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import webbrowser
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

DOTENV_RE = re.compile(r"^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$")
LOCAL_HOST_RE = re.compile(
    r"(localhost|127\.0\.0\.1|0\.0\.0\.0|\.local(?:[:/]|$))",
    re.I,
)
URLISH_KEY_RE = re.compile(r"(URL|HOST|ORIGIN|ENDPOINT|DOMAIN)$", re.I)
URLISH_VALUE_RE = re.compile(r"^(https?|postgres(?:ql)?)://", re.I)

# Keys where local and production are expected to differ
EXPECT_DIVERGE = {
    "DATABASE_URL",
    "DATABASE_URL_POOLED",
    "APP_URL",
    "BETTER_AUTH_URL",
    "PRODUCTION_URL",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_BETTER_AUTH_URL",
    "NEXT_PUBLIC_PRODUCTION_URL",
}

# Keys that often match across environments (API credentials)
EXPECT_MATCH = {
    "TMDB_ACCESS_TOKEN",
    "TMDB_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "OMDB_API_KEY",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
    "SENTRY_AUTH_TOKEN",
    "NEXT_PUBLIC_MIXPANEL_TOKEN",
}


@dataclass
class Finding:
    severity: str  # ok | info | warn | error
    category: str
    key: str
    message: str
    local_hint: str = ""
    prod_hint: str = ""
    gh_hint: str = ""


@dataclass
class ReportData:
    local: dict[str, str]
    production: dict[str, str]
    gh_secrets: list[str]
    gh_variables: dict[str, str]
    findings: list[Finding] = field(default_factory=list)
    repo: str = ""
    gh_env: str = "production"
    generated_at: str = ""


def load_dotenv(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.is_file():
        return env
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = DOTENV_RE.match(line)
        if not m:
            continue
        key, val = m.group(1), m.group(2)
        if (val.startswith('"') and val.endswith('"')) or (
            val.startswith("'") and val.endswith("'")
        ):
            val = val[1:-1]
        env[key] = val
    return env


def redact(value: str) -> str:
    if not value:
        return "(empty)"
    if URLISH_VALUE_RE.match(value):
        try:
            parsed = urlparse(value)
            host = parsed.hostname or "?"
            # hide userinfo for db urls
            return f"{parsed.scheme}://{host}{parsed.path if parsed.path and parsed.scheme.startswith('http') else ''}"
        except Exception:
            return "(url)"
    if "@" in value and "." in value and "://" not in value:
        # email-ish
        name, _, domain = value.partition("@")
        return f"{name[:2]}…@{domain}"
    if len(value) <= 6:
        return "•" * len(value)
    return f"{value[:3]}…{value[-2:]} ({len(value)} chars)"


def is_urlish(key: str, value: str) -> bool:
    return bool(URLISH_KEY_RE.search(key) or URLISH_VALUE_RE.match(value or ""))


def looks_local(value: str) -> bool:
    return bool(value and LOCAL_HOST_RE.search(value))


def looks_public_https(value: str) -> bool:
    if not value or not value.lower().startswith("https://"):
        return False
    return not looks_local(value)


def is_variable_key(key: str) -> bool:
    return key.startswith("NEXT_PUBLIC_")


def run_gh_json(args: list[str]) -> Any:
    try:
        out = subprocess.check_output(
            ["gh", *args],
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return json.loads(out or "[]")
    except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
        return []


def fetch_github(gh_env: str, repo_level: bool) -> tuple[str, list[str], dict[str, str]]:
    repo = ""
    try:
        repo = subprocess.check_output(
            ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
            text=True,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        repo = "(unavailable)"

    secret_args = ["secret", "list", "--json", "name"]
    var_args = ["variable", "list", "--json", "name,value"]
    if not repo_level:
        secret_args += ["--env", gh_env]
        var_args += ["--env", gh_env]

    secrets = [s["name"] for s in run_gh_json(secret_args) if "name" in s]
    variables = {
        v["name"]: v.get("value") or ""
        for v in run_gh_json(var_args)
        if "name" in v
    }
    return repo, sorted(secrets), variables


def analyze(data: ReportData) -> None:
    local, prod = data.local, data.production
    all_keys = sorted(set(local) | set(prod) | set(data.gh_secrets) | set(data.gh_variables))
    findings = data.findings

    for key in all_keys:
        in_local = key in local
        in_prod = key in prod
        in_gh_secret = key in data.gh_secrets
        in_gh_var = key in data.gh_variables
        lv = local.get(key, "")
        pv = prod.get(key, "")
        lh, ph = redact(lv) if in_local else "—", redact(pv) if in_prod else "—"
        if in_gh_var:
            gh_hint = f"variable={redact(data.gh_variables[key])}"
        elif in_gh_secret:
            gh_hint = "secret (value hidden)"
        else:
            gh_hint = "—"

        # Empty values
        if in_local and not lv:
            findings.append(
                Finding("error", "empty", key, ".env.local value is empty", lh, ph, gh_hint)
            )
        if in_prod and not pv:
            findings.append(
                Finding("error", "empty", key, ".env.production value is empty", lh, ph, gh_hint)
            )

        # Presence matrix
        if in_local and in_prod:
            if lv == pv:
                if key in EXPECT_DIVERGE:
                    findings.append(
                        Finding(
                            "warn",
                            "cross-file",
                            key,
                            "Same value in local and production, but this key usually differs by environment",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
                elif key in EXPECT_MATCH or not is_urlish(key, lv):
                    findings.append(
                        Finding(
                            "ok",
                            "cross-file",
                            key,
                            "Values match across .env.local and .env.production",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
                else:
                    findings.append(
                        Finding(
                            "info",
                            "cross-file",
                            key,
                            "Values match across files",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
            else:
                if key in EXPECT_MATCH:
                    findings.append(
                        Finding(
                            "warn",
                            "cross-file",
                            key,
                            "Values differ; these credentials often match across environments",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
                elif key in EXPECT_DIVERGE or is_urlish(key, lv) or is_urlish(key, pv):
                    findings.append(
                        Finding(
                            "ok",
                            "cross-file",
                            key,
                            "Values differ as expected between local and production",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
                else:
                    findings.append(
                        Finding(
                            "info",
                            "cross-file",
                            key,
                            "Values differ between local and production",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
        elif in_local and not in_prod:
            findings.append(
                Finding(
                    "info",
                    "presence",
                    key,
                    "Present in .env.local only (not in .env.production)",
                    lh,
                    ph,
                    gh_hint,
                )
            )
        elif in_prod and not in_local:
            findings.append(
                Finding(
                    "info",
                    "presence",
                    key,
                    "Present in .env.production only (not in .env.local)",
                    lh,
                    ph,
                    gh_hint,
                )
            )
        elif not in_local and not in_prod and (in_gh_secret or in_gh_var):
            findings.append(
                Finding(
                    "warn",
                    "presence",
                    key,
                    "On GitHub but missing from both local env files",
                    lh,
                    ph,
                    gh_hint,
                )
            )

        # Local host heuristics for .env.local
        if in_local and is_urlish(key, lv):
            if looks_local(lv):
                findings.append(
                    Finding(
                        "ok",
                        "local-host",
                        key,
                        ".env.local uses a local host (expected)",
                        lh,
                        ph,
                        gh_hint,
                    )
                )
            elif looks_public_https(lv):
                # Database URLs pointing at remote neon are normal for local-dev-against-cloud
                if key.startswith("DATABASE"):
                    findings.append(
                        Finding(
                            "info",
                            "local-host",
                            key,
                            ".env.local points at a remote DB host (common for Neon branches; confirm it is not production)",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
                else:
                    findings.append(
                        Finding(
                            "warn",
                            "local-host",
                            key,
                            ".env.local URL is a public host — prefer localhost for local app URLs",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
            elif lv.lower().startswith("http://") and not looks_local(lv):
                findings.append(
                    Finding(
                        "warn",
                        "local-host",
                        key,
                        ".env.local uses plain http to a non-local host",
                        lh,
                        ph,
                        gh_hint,
                    )
                )

        # Production heuristics for .env.production
        if in_prod and is_urlish(key, pv):
            if looks_local(pv):
                findings.append(
                    Finding(
                        "error",
                        "prod-host",
                        key,
                        ".env.production must not use localhost / local hosts",
                        lh,
                        ph,
                        gh_hint,
                    )
                )
            elif pv.lower().startswith("http://") and not key.startswith("DATABASE"):
                findings.append(
                    Finding(
                        "error",
                        "prod-host",
                        key,
                        ".env.production app URL should use https, not http",
                        lh,
                        ph,
                        gh_hint,
                    )
                )
            elif looks_public_https(pv) or (
                key.startswith("DATABASE") and "://" in pv and not looks_local(pv)
            ):
                findings.append(
                    Finding(
                        "ok",
                        "prod-host",
                        key,
                        ".env.production uses a non-local host (expected)",
                        lh,
                        ph,
                        gh_hint,
                    )
                )

        # GitHub coverage for production keys
        if in_prod:
            classified_var = is_variable_key(key)
            if classified_var:
                if in_gh_var:
                    remote_val = data.gh_variables[key]
                    if remote_val == pv:
                        findings.append(
                            Finding(
                                "ok",
                                "github",
                                key,
                                "GitHub variable matches .env.production",
                                lh,
                                ph,
                                gh_hint,
                            )
                        )
                    else:
                        findings.append(
                            Finding(
                                "warn",
                                "github",
                                key,
                                "GitHub variable exists but value differs from .env.production",
                                lh,
                                ph,
                                gh_hint,
                            )
                        )
                elif in_gh_secret:
                    findings.append(
                        Finding(
                            "warn",
                            "github",
                            key,
                            "On GitHub as a secret, but NEXT_PUBLIC_* keys are usually variables",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
                else:
                    findings.append(
                        Finding(
                            "error",
                            "github",
                            key,
                            "In .env.production but missing from GitHub environment variables",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
            else:
                if in_gh_secret:
                    findings.append(
                        Finding(
                            "ok",
                            "github",
                            key,
                            "GitHub secret name present (value cannot be verified)",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
                elif in_gh_var:
                    findings.append(
                        Finding(
                            "warn",
                            "github",
                            key,
                            "On GitHub as a variable; consider storing as a secret",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )
                else:
                    findings.append(
                        Finding(
                            "error",
                            "github",
                            key,
                            "In .env.production but missing from GitHub environment secrets",
                            lh,
                            ph,
                            gh_hint,
                        )
                    )


def severity_rank(sev: str) -> int:
    return {"error": 0, "warn": 1, "info": 2, "ok": 3}.get(sev, 9)


def render_html(data: ReportData, local_path: Path, prod_path: Path) -> str:
    findings = sorted(
        data.findings,
        key=lambda f: (severity_rank(f.severity), f.category, f.key),
    )
    counts = {s: 0 for s in ("error", "warn", "info", "ok")}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1

    def rows(category_filter: str | None = None) -> str:
        items = (
            findings
            if category_filter is None
            else [f for f in findings if f.category == category_filter]
        )
        if not items:
            return '<tr><td colspan="6" class="muted">None</td></tr>'
        out = []
        for f in items:
            out.append(
                "<tr class='sev-{sev}'>"
                "<td><span class='badge {sev}'>{sev}</span></td>"
                "<td>{cat}</td>"
                "<td><code>{key}</code></td>"
                "<td>{msg}</td>"
                "<td><code>{lh}</code></td>"
                "<td><code>{ph}</code></td>"
                "</tr>".format(
                    sev=html.escape(f.severity),
                    cat=html.escape(f.category),
                    key=html.escape(f.key),
                    msg=html.escape(f.message),
                    lh=html.escape(f.local_hint or "—"),
                    ph=html.escape(f.prod_hint or "—"),
                )
            )
        return "\n".join(out)

    all_keys = sorted(set(data.local) | set(data.production))
    matrix_rows = []
    for key in all_keys:
        lv = data.local.get(key)
        pv = data.production.get(key)
        gh = (
            "variable"
            if key in data.gh_variables
            else "secret"
            if key in data.gh_secrets
            else "—"
        )
        status = "both" if lv is not None and pv is not None else "local" if lv is not None else "prod"
        match = "—"
        if lv is not None and pv is not None:
            match = "same" if lv == pv else "different"
        matrix_rows.append(
            "<tr>"
            f"<td><code>{html.escape(key)}</code></td>"
            f"<td>{'✓' if lv is not None else '—'}</td>"
            f"<td>{'✓' if pv is not None else '—'}</td>"
            f"<td>{html.escape(gh)}</td>"
            f"<td class='match-{html.escape(match)}'>{html.escape(match)}</td>"
            f"<td><code>{html.escape(redact(lv) if lv is not None else '—')}</code></td>"
            f"<td><code>{html.escape(redact(pv) if pv is not None else '—')}</code></td>"
            f"<td class='status-{status}'>{html.escape(status)}</td>"
            "</tr>"
        )

    categories = [
        ("local-host", "Local file host checks (.env.local)"),
        ("prod-host", "Production file host checks (.env.production)"),
        ("cross-file", "Local ↔ production value comparison"),
        ("github", "GitHub environment coverage"),
        ("presence", "Key presence"),
        ("empty", "Empty values"),
    ]

    sections = []
    for cat_id, title in categories:
        sections.append(
            f"<section><h2>{html.escape(title)}</h2>"
            "<table><thead><tr>"
            "<th>Severity</th><th>Category</th><th>Key</th><th>Message</th>"
            "<th>Local (redacted)</th><th>Production (redacted)</th>"
            "</tr></thead><tbody>"
            f"{rows(cat_id)}"
            "</tbody></table></section>"
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Env report — {html.escape(data.repo or 'repo')}</title>
<style>
  :root {{
    --bg: #f6f3ee;
    --ink: #1c1917;
    --muted: #78716c;
    --card: #fffdf9;
    --line: #e7e0d6;
    --ok: #166534;
    --ok-bg: #dcfce7;
    --warn: #92400e;
    --warn-bg: #fef3c7;
    --error: #991b1b;
    --error-bg: #fee2e2;
    --info: #1e3a5f;
    --info-bg: #e0f2fe;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: var(--ink);
    background:
      radial-gradient(1200px 500px at 10% -10%, #fde68a55, transparent),
      radial-gradient(900px 400px at 100% 0%, #bbf7d055, transparent),
      var(--bg);
    line-height: 1.45;
  }}
  main {{ max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }}
  h1 {{ font-size: clamp(1.8rem, 3vw, 2.4rem); margin: 0 0 .4rem; letter-spacing: -0.02em; }}
  h2 {{ font-size: 1.15rem; margin: 2rem 0 .75rem; }}
  .sub {{ color: var(--muted); margin-bottom: 1.5rem; }}
  .cards {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; margin: 1.25rem 0 2rem; }}
  .card {{
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 1rem 1.1rem;
  }}
  .card strong {{ display: block; font-size: 1.6rem; }}
  .card.error strong {{ color: var(--error); }}
  .card.warn strong {{ color: var(--warn); }}
  .card.info strong {{ color: var(--info); }}
  .card.ok strong {{ color: var(--ok); }}
  table {{
    width: 100%;
    border-collapse: collapse;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
    font-size: .86rem;
  }}
  th, td {{
    text-align: left;
    padding: .65rem .7rem;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }}
  th {{ background: #faf6f0; color: var(--muted); font-weight: 600; }}
  tr:last-child td {{ border-bottom: 0; }}
  code {{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .8rem; }}
  .badge {{
    display: inline-block;
    padding: .15rem .45rem;
    border-radius: 999px;
    font-size: .72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .04em;
  }}
  .badge.ok {{ background: var(--ok-bg); color: var(--ok); }}
  .badge.warn {{ background: var(--warn-bg); color: var(--warn); }}
  .badge.error {{ background: var(--error-bg); color: var(--error); }}
  .badge.info {{ background: var(--info-bg); color: var(--info); }}
  .muted {{ color: var(--muted); }}
  .legend {{ color: var(--muted); font-size: .9rem; margin-top: 2rem; }}
  @media (max-width: 800px) {{
    .cards {{ grid-template-columns: repeat(2, 1fr); }}
    table {{ display: block; overflow-x: auto; }}
  }}
</style>
</head>
<body>
<main>
  <h1>Environment report</h1>
  <p class="sub">
    Repo <strong>{html.escape(data.repo or '—')}</strong> ·
    GitHub env <strong>{html.escape(data.gh_env)}</strong> ·
    Generated {html.escape(data.generated_at)}<br/>
    Files: <code>{html.escape(str(local_path))}</code> ·
    <code>{html.escape(str(prod_path))}</code>
  </p>

  <div class="cards">
    <div class="card error"><span>Errors</span><strong>{counts['error']}</strong></div>
    <div class="card warn"><span>Warnings</span><strong>{counts['warn']}</strong></div>
    <div class="card info"><span>Info</span><strong>{counts['info']}</strong></div>
    <div class="card ok"><span>OK</span><strong>{counts['ok']}</strong></div>
  </div>

  <section>
    <h2>Key matrix</h2>
    <table>
      <thead>
        <tr>
          <th>Key</th>
          <th>Local</th>
          <th>Prod file</th>
          <th>GitHub</th>
          <th>Values</th>
          <th>Local (redacted)</th>
          <th>Prod (redacted)</th>
          <th>Presence</th>
        </tr>
      </thead>
      <tbody>
        {''.join(matrix_rows) or '<tr><td colspan="8" class="muted">No keys</td></tr>'}
      </tbody>
    </table>
  </section>

  {''.join(sections)}

  <p class="legend">
    Values are redacted in this report (hosts for URLs, truncated secrets).
    GitHub secret values cannot be read via the API — only names are checked.
    Heuristic: .env.local app URLs should prefer localhost; .env.production must not.
  </p>
</main>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local", default=".env.local")
    parser.add_argument("--production", default=".env.production")
    parser.add_argument("--gh-env", default="production")
    parser.add_argument("--repo-level", action="store_true")
    parser.add_argument("--out", default="reports/env-report.html")
    parser.add_argument("--open", action="store_true", help="Open report in browser")
    parser.add_argument(
        "--skip-github",
        action="store_true",
        help="Skip GitHub API calls (files only)",
    )
    args = parser.parse_args()

    local_path = Path(args.local)
    prod_path = Path(args.production)
    if not local_path.is_file() and not prod_path.is_file():
        print("error: neither env file found", file=sys.stderr)
        return 1

    local = load_dotenv(local_path)
    production = load_dotenv(prod_path)

    if args.skip_github:
        repo, gh_secrets, gh_variables = "(skipped)", [], {}
    else:
        repo, gh_secrets, gh_variables = fetch_github(args.gh_env, args.repo_level)

    data = ReportData(
        local=local,
        production=production,
        gh_secrets=gh_secrets,
        gh_variables=gh_variables,
        repo=repo,
        gh_env="repository" if args.repo_level else args.gh_env,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    )
    analyze(data)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(render_html(data, local_path, prod_path), encoding="utf-8")

    errors = sum(1 for f in data.findings if f.severity == "error")
    warns = sum(1 for f in data.findings if f.severity == "warn")
    print(f"Wrote {out_path}")
    print(f"Summary: {errors} error(s), {warns} warning(s), {len(data.findings)} finding(s)")
    print(f"GitHub scope: {data.gh_env} · secrets={len(gh_secrets)} variables={len(gh_variables)}")

    if args.open:
        webbrowser.open(out_path.resolve().as_uri())

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
