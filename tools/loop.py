#!/usr/bin/env python3
"""Task-queue loop driver: vitest is the judge, Muse Spark (via opencode) is the builder.

Nico and the team own docs/, tests/, tools/, AGENTS.md and this file. Muse owns
packages/*/src and apps/*/src and nothing else — anything it touches outside those
paths is reverted before the next iteration, so scope is enforced by git, not by
good manners. Modeled on startclass/loop.py, but task-queue shaped instead of a
single monolithic spec: docs/TASKS.md lists ordered tasks, each with its own test
file, and this driver works through them one at a time, ticking the checkbox and
committing after each one goes green.

Builder model is opencode/space-bunny-free — a stealth preview model OpenCode is running
free/unlimited through ~30 Sep 2026 (see docs/TASKS.md note). It replaced Muse Spark on
2026-09-24 because it has no contributor-tier quota wall. If it goes away or starts
rate-limiting before the queue is done, swap MODEL back to a Muse Spark id here; the rest
of the driver (sleep-and-retry on a quota hit, no cascade) still applies either way.

Usage:  python3 tools/loop.py [--max-iters-per-task 8] [--timeout 1800]
        python3 tools/loop.py --only tests/structures/stack-queue.test.ts
"""

from __future__ import annotations

import argparse
import atexit
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOOP_DIR = ROOT / ".loop"
TASKS_FILE = ROOT / "docs" / "TASKS.md"
VITEST = ["pnpm", "exec", "vitest", "run"]

MODEL = "opencode/space-bunny-free"

# Everything Muse is not allowed to change. Reverted after every iteration.
PROTECTED = [
    "docs",
    "tests",
    "tools",
    "AGENTS.md",
    "package.json",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    "tsconfig.base.json",
    "vitest.config.ts",
    ".gitignore",
]

FAILED_RE = re.compile(r"^\s*(?:FAIL|×)\s+(\S+)", re.MULTILINE)
# Quota/rate-limit signals seen from opencode + contributor-tier Muse. Unlike
# startclass's cascade, this is never a reason to switch model — only to wait.
QUOTA_RE = re.compile(
    r"\b(?:429|rate.?limit|quota|insufficient credits|too many requests)\b",
    re.IGNORECASE,
)

FIRST_PROMPT = """Read AGENTS.md, then docs/REQUIREMENTS.md, then docs/TASKS.md in this repo.

Your task right now is: {task_desc}

Its test file is {test_file} — read it, then implement exactly what it needs under \
packages/*/src or apps/*/src (whichever the task is about). Do not touch docs/, tests/, \
tools/, AGENTS.md, or any lockfile/config file — changes there are reverted automatically \
and waste your turn.

Verify with: pnpm exec vitest run {test_file}

Keep going until that test file passes.
"""

RETRY_PROMPT = """The task's test file still fails. Fix the implementation under \
packages/*/src or apps/*/src only — do not edit tests/, docs/, tools/, AGENTS.md, or any \
lockfile/config file, those edits are reverted automatically.

Task: {task_desc}
Test file: {test_file}

vitest output:

```
{output}
```
"""


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, **kw)


def git(*args: str) -> subprocess.CompletedProcess:
    return run(["git", *args])


def ensure_repo() -> None:
    if not (ROOT / ".git").is_dir():
        git("init", "-q")
    git("add", "-A")
    if git("diff", "--cached", "--quiet").returncode != 0:
        git("commit", "-q", "-m", "loop: baseline")


def run_tests(test_files: str | list[str] | None = None) -> tuple[bool, str, set[str]]:
    if isinstance(test_files, str):
        test_files = [test_files]
    cmd = list(VITEST) + (test_files or [])
    proc = run(cmd)
    output = (proc.stdout + proc.stderr).strip()
    return proc.returncode == 0, output, set(FAILED_RE.findall(output))


def revert_protected() -> list[str]:
    """Undo any Muse edit outside the allowed src paths."""
    changed = [
        line[3:].strip().strip('"')
        for line in git("status", "--porcelain", "--", *PROTECTED).stdout.splitlines()
    ]
    if changed:
        git("checkout", "--", *PROTECTED)
        git("clean", "-qfd", "--", *PROTECTED)
    return changed


def call_muse(prompt: str, first: bool, timeout: int) -> tuple[int, str]:
    cmd = ["opencode", "run", "--dir", str(ROOT), "-m", MODEL]
    if not first:
        cmd.append("--continue")
    cmd.append(prompt)
    try:
        proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
        return proc.returncode, proc.stdout + proc.stderr
    except subprocess.TimeoutExpired as exc:
        return 124, f"opencode timed out after {timeout}s\n{exc.stdout or ''}"


def parse_tasks() -> list[dict[str, str]]:
    """Read the task table from docs/TASKS.md. Only rows with an actual test file
    and an unchecked box are candidates to run."""
    tasks = []
    for line in TASKS_FILE.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| T"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 5:
            continue
        task_id, desc, fr, test_file, done = cells[:5]
        tasks.append(
            {
                "id": task_id,
                "desc": desc,
                "fr": fr,
                "test_file": test_file.strip("`"),
                "done": "[x]" in done.lower(),
            }
        )
    return tasks


def mark_done(task_id: str) -> None:
    text = TASKS_FILE.read_text(encoding="utf-8")
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.startswith(f"| {task_id} "):
            cells = line.strip("|").split("|")
            cells[-1] = " [x] "
            lines[i] = "|" + "|".join(cells) + "|"
            break
    TASKS_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def next_task(tasks: list[dict[str, str]], only: str | None) -> dict[str, str] | None:
    for t in tasks:
        if t["done"] or t["test_file"] == "—" or "manual" in t["test_file"]:
            continue
        if only and t["test_file"] != only:
            continue
        return t
    return None


def regression_check_files(all_tasks: list[dict[str, str]], current_test_file: str) -> list[str]:
    """Test files that must stay green after this task: every already-done task's test,
    plus the current one. NOT the whole tests/ tree — later tasks are red on purpose
    until their own turn, and running the full suite here mistakes that for a
    regression (this bit us on T2: it fed T3-T6's pre-existing red into the retry
    prompt as if T2 had broken them)."""
    files = [
        t["test_file"]
        for t in all_tasks
        if t["done"] and t["test_file"] != "—" and "manual" not in t["test_file"]
    ]
    if current_test_file not in files:
        files.append(current_test_file)
    return files


def run_task(
    task: dict[str, str],
    all_tasks: list[dict[str, str]],
    max_iters: int,
    timeout: int,
    quota_sleep: int,
) -> int:
    test_file = task["test_file"]
    print(f"\n=== {task['id']}: {task['desc']} ({test_file}) ===", flush=True)
    regression_files = regression_check_files(all_tasks, test_file)

    ok, output, failing = run_tests(test_file)
    if ok:
        print(f"[{task['id']}] already green, marking done")
        mark_done(task["id"])
        git("add", "-A")
        git("commit", "-q", "-m", f"chore({task['id']}): mark done, already passing")
        return 0

    fresh = True
    for i in range(1, max_iters + 1):
        prompt = (
            FIRST_PROMPT.format(task_desc=task["desc"], test_file=test_file)
            if fresh
            else RETRY_PROMPT.format(
                task_desc=task["desc"], test_file=test_file, output=output[-8000:]
            )
        )
        t0 = time.time()
        code, muse_log = call_muse(prompt, first=fresh, timeout=timeout)
        (LOOP_DIR / f"{task['id']}-iter{i:02d}-muse.log").write_text(muse_log, encoding="utf-8")

        if code == 124 or QUOTA_RE.search(muse_log):
            print(
                f"[{task['id']}][{i:02d}] quota/timeout hit, sleeping {quota_sleep}s then "
                "retrying Muse (no fallback)",
                flush=True,
            )
            time.sleep(quota_sleep)
            continue  # same iteration index, don't burn an attempt on a quota wall

        fresh = False
        reverted = revert_protected()
        ok, output, failing = run_tests(test_file)
        (LOOP_DIR / f"{task['id']}-iter{i:02d}-tests.log").write_text(output, encoding="utf-8")

        state = "GREEN" if ok else f"{len(failing)} failing"
        note = f" reverted={reverted}" if reverted else ""
        print(f"[{task['id']}][{i:02d}] {state:>16}  ({time.time() - t0:.0f}s){note}", flush=True)

        if ok:
            reg_ok, reg_output, _ = run_tests(regression_files)
            if not reg_ok:
                print(
                    f"[{task['id']}] task test green but a previously-done task's test "
                    "regressed — not committing. Feeding the failure back to the model."
                )
                output = reg_output
                fresh = False
                continue
            mark_done(task["id"])
            git("add", "-A")
            git("commit", "-q", "-m", f"feat({task['id']}): {task['desc']}")
            print(f"[{task['id']}] GREEN, no regression on prior tasks, committed.")
            return 0

    print(f"[{task['id']}] EXHAUSTED after {max_iters} iterations, {len(failing)} still failing")
    return 3


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-iters-per-task", type=int, default=8)
    ap.add_argument("--timeout", type=int, default=1800, help="per-iteration opencode timeout")
    ap.add_argument(
        "--quota-sleep",
        type=int,
        default=3600,
        help="seconds to sleep on a quota/429 hit before retrying Muse",
    )
    ap.add_argument("--only", help="run a single task by its test-file path, ignore the queue order")
    ap.add_argument("--max-tasks", type=int, default=None, help="stop after N tasks this run")
    args = ap.parse_args()

    LOOP_DIR.mkdir(exist_ok=True)

    # Lockfile with pid, same lesson as startclass: pgrep/pkill text-matching self-matches
    # the shell that launched it. Never repeat that mistake here.
    lock = LOOP_DIR / "driver.lock"
    if lock.exists():
        try:
            alive_pid = lock.read_text().strip()
            os.kill(int(alive_pid), 0)
        except (ValueError, ProcessLookupError):
            lock.unlink(missing_ok=True)  # dead pid, orphaned lock
        else:
            print(f"another loop is already running (pid {alive_pid}). Kill it first.")
            return 4
    lock.write_text(str(os.getpid()))
    atexit.register(lock.unlink, missing_ok=True)

    ensure_repo()

    done_count = 0
    while True:
        if args.max_tasks is not None and done_count >= args.max_tasks:
            print(f"reached --max-tasks {args.max_tasks}, stopping")
            return 0

        tasks = parse_tasks()
        task = next_task(tasks, args.only)
        if task is None:
            if args.only:
                print(f"no unchecked task matches --only {args.only}")
                return 0
            print("no unchecked automatable tasks left in docs/TASKS.md")
            return 0

        rc = run_task(task, tasks, args.max_iters_per_task, args.timeout, args.quota_sleep)
        if rc != 0:
            return rc
        done_count += 1
        if args.only:
            return 0


if __name__ == "__main__":
    sys.exit(main())
