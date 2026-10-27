#!/usr/bin/env python3
"""Apply the Azure auto-use toggle to the current AO3_Cloudflare_Worker_Root_Fix checkout."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import shutil
import subprocess
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one matching source anchor, found {count}. No files have been written.")
    return text.replace(old, new, 1)


def find_project_root() -> Path:
    here = Path(__file__).resolve().parent
    candidates = [
        here,
        here / "AO3_Cloudflare_Worker_Root_Fix",
        here / "ao3-main" / "AO3_Cloudflare_Worker_Root_Fix",
        here / "ao3" / "AO3_Cloudflare_Worker_Root_Fix",
    ]
    for candidate in candidates:
        if (candidate / "public" / "index.html").is_file() and (candidate / "public" / "assets" / "app.js").is_file():
            return candidate
    raise FileNotFoundError(
        "Could not find AO3_Cloudflare_Worker_Root_Fix. Put this script either inside that folder "
        "or beside it in the extracted istherenaoco/ao3 repository."
    )


def main() -> int:
    root = find_project_root()
    app_path = root / "public" / "assets" / "app.js"
    html_path = root / "public" / "index.html"
    package_path = root / "package.json"
    tests_dir = root / "tests"

    app = app_path.read_text(encoding="utf-8")
    html = html_path.read_text(encoding="utf-8")
    package = package_path.read_text(encoding="utf-8")

    # State defaults and migration for settings saved before the toggle existed.
    app = replace_once(
        app,
        "window.__AO3_BUILD_VERSION__ = '100';",
        "window.__AO3_BUILD_VERSION__ = '101';",
        "app build marker",
    )
    app = replace_once(
        app,
        "          azureApiKey: '',\n          azureRegion: '',\n          groqApiKey: '',",
        "          azureApiKey: '',\n          azureRegion: '',\n          azureEnabled: true,\n          groqApiKey: '',",
        "default provider settings",
    )
    app = replace_once(
        app,
        "            if (typeof state.settings.groqEnabled !== 'boolean') state.settings.groqEnabled = true;\n            if (typeof state.settings.workersAiEnabled !== 'boolean') state.settings.workersAiEnabled = true;",
        "            if (typeof state.settings.azureEnabled !== 'boolean') state.settings.azureEnabled = true;\n            if (typeof state.settings.groqEnabled !== 'boolean') state.settings.groqEnabled = true;\n            if (typeof state.settings.workersAiEnabled !== 'boolean') state.settings.workersAiEnabled = true;",
        "old-settings migration",
    )

    # Keep the toggle in Google Drive preferences and encrypted settings backups.
    app = replace_once(
        app,
        "          azureRegion: String(s.azureRegion || ''),\n          groqModel: String(s.groqModel || 'openai/gpt-oss-120b'),\n          groqEnabled: s.groqEnabled !== false,",
        "          azureRegion: String(s.azureRegion || ''),\n          azureEnabled: s.azureEnabled !== false,\n          groqModel: String(s.groqModel || 'openai/gpt-oss-120b'),\n          groqEnabled: s.groqEnabled !== false,",
        "Drive user preference serialization",
    )
    app = replace_once(
        app,
        "        ['groqEnabled', 'workersAiEnabled'].forEach(function(key) { if (typeof rs[key] === 'boolean') state.settings[key] = rs[key]; });",
        "        ['groqEnabled', 'workersAiEnabled', 'azureEnabled'].forEach(function(key) { if (typeof rs[key] === 'boolean') state.settings[key] = rs[key]; });",
        "Drive user preference restore",
    )
    app = replace_once(
        app,
        "          azureApiKey: String(s.azureApiKey || ''),\n          azureRegion: String(s.azureRegion || ''),\n          groqApiKey: String(s.groqApiKey || ''),",
        "          azureApiKey: String(s.azureApiKey || ''),\n          azureRegion: String(s.azureRegion || ''),\n          azureEnabled: s.azureEnabled !== false,\n          groqApiKey: String(s.groqApiKey || ''),",
        "encrypted Drive settings serialization",
    )
    app = replace_once(
        app,
        "        if (typeof decoded.settings.groqEnabled === 'boolean') state.settings.groqEnabled = decoded.settings.groqEnabled;\n        if (typeof decoded.settings.workersAiEnabled === 'boolean') state.settings.workersAiEnabled = decoded.settings.workersAiEnabled;",
        "        if (typeof decoded.settings.groqEnabled === 'boolean') state.settings.groqEnabled = decoded.settings.groqEnabled;\n        if (typeof decoded.settings.workersAiEnabled === 'boolean') state.settings.workersAiEnabled = decoded.settings.workersAiEnabled;\n        if (typeof decoded.settings.azureEnabled === 'boolean') state.settings.azureEnabled = decoded.settings.azureEnabled;",
        "encrypted Drive settings restore",
    )
    app = replace_once(
        app,
        "        const groqEnabledInput = document.getElementById('groqAutoEnabledInput');\n        if (groqEnabledInput) groqEnabledInput.checked = state.settings.groqEnabled !== false;\n        const workersAiEnabledInput = document.getElementById('workersAiAutoEnabledInput');",
        "        const groqEnabledInput = document.getElementById('groqAutoEnabledInput');\n        if (groqEnabledInput) groqEnabledInput.checked = state.settings.groqEnabled !== false;\n        const azureEnabledInput = document.getElementById('azureAutoEnabledInput');\n        if (azureEnabledInput) azureEnabledInput.checked = state.settings.azureEnabled !== false;\n        const workersAiEnabledInput = document.getElementById('workersAiAutoEnabledInput');",
        "settings form restore",
    )
    app = replace_once(
        app,
        "          document.getElementById('azureRegionInput').value = state.settings.azureRegion || '';\n          const azureQuotaTierInput = document.getElementById('azureQuotaTierInput');",
        "          document.getElementById('azureRegionInput').value = state.settings.azureRegion || '';\n          document.getElementById('azureAutoEnabledInput').checked = state.settings.azureEnabled !== false;\n          const azureQuotaTierInput = document.getElementById('azureQuotaTierInput');",
        "API settings modal fill",
    )
    app = replace_once(
        app,
        "          state.settings.azureRegion = document.getElementById('azureRegionInput').value.trim();\n          state.settings.azureQuotaTier = (document.getElementById('azureQuotaTierInput') && document.getElementById('azureQuotaTierInput').value) || 'unknown';",
        "          state.settings.azureRegion = document.getElementById('azureRegionInput').value.trim();\n          state.settings.azureEnabled = document.getElementById('azureAutoEnabledInput').checked;\n          state.settings.azureQuotaTier = (document.getElementById('azureQuotaTierInput') && document.getElementById('azureQuotaTierInput').value) || 'unknown';",
        "API settings save",
    )

    # If disabled, Azure is excluded from automatic failover/hedged requests. An explicit
    # manual selection of Azure remains an intentional override, like the other manual API controls.
    app = replace_once(
        app,
        "        async function attemptAzureProvider() {\n        // Azure backup attempt. It can run in parallel when Groq exceeds the hedge delay.\n        if (!window._ao3CloudflareProviderConfigReady) await refreshCloudflareProviderConfig();",
        "        async function attemptAzureProvider() {\n        // Azure backup attempt. It can run in parallel when Groq exceeds the hedge delay.\n        if (state.settings.azureEnabled === false && forcedProvider !== 'azure') {\n          setTranslationProviderStatus('Azure Translator', '자동 사용 안 함 · 건너뜀');\n          console.info('Azure Translator auto-use is disabled in settings; skipping automatic backup.');\n          return null;\n        }\n        if (!window._ao3CloudflareProviderConfigReady) await refreshCloudflareProviderConfig();",
        "Azure automatic provider guard",
    )

    # Add a settings toggle matching the existing Workers AI/Groq toggles.
    html = replace_once(
        html,
        '        <div id="azureApiKeyBox" class="space-y-2 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">\n          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">',
        '        <div id="azureApiKeyBox" class="space-y-2 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">\n'
        '          <label class="flex items-start gap-2 rounded-lg border border-blue-200 bg-white/80 p-2.5 cursor-pointer">\n'
        '            <input id="azureAutoEnabledInput" type="checkbox" class="mt-0.5 accent-blue-600" checked />\n'
        '            <span class="block">\n'
        '              <span class="block text-xs font-semibold text-blue-950">Azure Translator 자동 사용</span>\n'
        '              <span class="block mt-0.5 text-[11px] leading-relaxed text-blue-900/80">끄면 자동 번역의 대체·병렬 백업 요청에서 Azure를 건너뜁니다. 직접 API 선택에서 수동 재시도할 때는 사용할 수 있습니다.</span>\n'
        '            </span>\n'
        '          </label>\n'
        '          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">',
        "Azure automatic-use checkbox UI",
    )
    html = replace_once(
        html,
        '<p class="text-[11px] text-blue-900/80 leading-relaxed">Gemini와 Workers AI 다음 우선순위입니다. Groq 요청이 지연되거나 실패하면 Azure가 병렬 백업을 시작해 먼저 검증을 통과한 결과를 사용합니다.</p>',
        '<p class="text-[11px] text-blue-900/80 leading-relaxed">켜져 있으면 Groq 요청이 지연되거나 실패할 때 Azure가 병렬 백업을 시작해 먼저 검증을 통과한 결과를 사용합니다. 자동 사용을 끄면 Azure 백업 요청은 보내지 않습니다.</p>',
        "Azure help text",
    )
    html = replace_once(html, "app.js?v=94.0", "app.js?v=95.0", "app.js cache-busting version")
    html = replace_once(html, "AO3_BUILD=ao3-bookshelf-ui-v100.0", "AO3_BUILD=ao3-bookshelf-ui-v101.0", "HTML build marker")

    # Keep the current HTML asset-version checks aligned with main, whose CSS/App.js
    # cache-busting references had drifted from the original regression checks.
    changed_test_contents: dict[Path, str] = {}
    for test_path in sorted(tests_dir.glob("*.cjs")):
        original = test_path.read_text(encoding="utf-8")
        updated = original.replace("app.css?v=86.0", "app.css?v=87.0")
        updated = updated.replace("/assets/app.css?v=86.0", "/assets/app.css?v=87.0")
        updated = updated.replace("app.js?v=94.0", "app.js?v=95.0")
        updated = updated.replace("/assets/app.js?v=94.0", "/assets/app.js?v=95.0")
        updated = updated.replace("AO3_BUILD=ao3-bookshelf-ui-v94.0", "AO3_BUILD=ao3-bookshelf-ui-v101.0")
        if updated != original:
            changed_test_contents[test_path] = updated

    test_name = "test-azure-auto-toggle-v101.cjs"
    test_path = tests_dir / test_name
    if test_path.exists():
        raise FileExistsError(f"Refusing to overwrite existing {test_path}")
    test_content = '''const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(html.includes('id="azureAutoEnabledInput"'), 'Azure automatic-use checkbox is missing');
assert(html.includes('Azure Translator 자동 사용'), 'Azure toggle label is missing');
assert(js.includes('azureEnabled: true'), 'Azure auto-use must default to enabled for existing users');
assert(js.includes("state.settings.azureEnabled = document.getElementById('azureAutoEnabledInput').checked"), 'Azure toggle is not saved');
assert(js.includes("state.settings.azureEnabled === false && forcedProvider !== 'azure'"), 'Disabled Azure must be skipped for automatic failover');
assert(js.includes("['groqEnabled', 'workersAiEnabled', 'azureEnabled']"), 'Azure toggle is missing from Drive preference restoration');
assert(js.includes("if (typeof decoded.settings.azureEnabled === 'boolean') state.settings.azureEnabled = decoded.settings.azureEnabled;"), 'Azure toggle is missing from encrypted settings restoration');
assert(html.includes('app.js?v=95.0'), 'app.js cache-busting reference was not updated');
console.log('Azure auto-use toggle regression checks passed.');
'''
    package = replace_once(
        package,
        "node tests/test-ao3-import-interstitials.cjs",
        "node tests/test-ao3-import-interstitials.cjs && node tests/test-azure-auto-toggle-v101.cjs",
        "package check test registration",
    )

    # Validate all essential markers before writing anything.
    for needle, label in [
        ("id=\"azureAutoEnabledInput\"", "Azure toggle HTML"),
        ("Azure Translator 자동 사용", "Azure toggle label"),
        ("app.js?v=95.0", "app.js cache bust"),
        ("AO3_BUILD=ao3-bookshelf-ui-v101.0", "HTML build marker"),
    ]:
        if needle not in html:
            raise RuntimeError(f"Validation failed: {label} missing")
    for needle, label in [
        ("window.__AO3_BUILD_VERSION__ = '101';", "app build marker"),
        ("state.settings.azureEnabled = document.getElementById('azureAutoEnabledInput').checked", "saved Azure toggle"),
        ("state.settings.azureEnabled === false && forcedProvider !== 'azure'", "Azure runtime guard"),
        ("azureEnabled: s.azureEnabled !== false", "Drive backup persistence"),
    ]:
        if needle not in app:
            raise RuntimeError(f"Validation failed: {label} missing")

    # Back up all files being changed, then write them as a batch.
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = root.parent / (".azure-toggle-backup-" + stamp)
    files_to_write: dict[Path, str] = {
        app_path: app,
        html_path: html,
        package_path: package,
        test_path: test_content,
    }
    files_to_write.update(changed_test_contents)
    backup_root.mkdir(parents=True, exist_ok=False)
    for path in files_to_write:
        if path.exists():
            rel = path.relative_to(root)
            backup = backup_root / rel
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, backup)
    for path, content in files_to_write.items():
        path.write_text(content, encoding="utf-8", newline="\n")

    print("Azure automatic-use toggle applied.")
    print(f"Project: {root}")
    print(f"Backup (outside project folder): {backup_root}")
    print("Changed files:")
    for path in sorted(files_to_write):
        print(" -", path.relative_to(root))

    try:
        check = subprocess.run(["node", "--check", str(app_path)], cwd=root, check=False, capture_output=True, text=True)
        if check.returncode == 0:
            print("Syntax check: node --check public/assets/app.js passed.")
        else:
            print("Syntax check failed. Restore the backup before committing:")
            print(check.stderr.strip() or check.stdout.strip())
            return 2
    except FileNotFoundError:
        print("Node.js not found; run npm run check after installing Node.js.")
    print("Next: run npm run check, inspect git diff, then commit/push the changes.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
