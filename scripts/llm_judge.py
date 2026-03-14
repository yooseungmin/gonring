from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from haw.config import load_settings

DEFAULT_BASE_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-sonnet-4-6"
DEFAULT_TIMEOUT_SEC = 30
DEFAULT_MAX_TOKENS = 800


@dataclass(frozen=True)
class JudgeResult:
    case_id: str
    scores: dict[str, int]
    overall: int
    rationale: str
    raw: dict[str, Any]


def _extract_text(payload: dict[str, Any]) -> str:
    parts = payload.get("content", [])
    if not isinstance(parts, list):
        return ""
    text_parts: list[str] = []
    for part in parts:
        if not isinstance(part, dict):
            continue
        if part.get("type") == "text":
            text_parts.append(str(part.get("text", "")))
    return "".join(text_parts).strip()


def _extract_json(text: str) -> dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("no json object found in LLM response")
    return json.loads(text[start : end + 1])


def _judge_case(
    *,
    model: str,
    base_url: str,
    api_key: str,
    timeout: float,
    max_tokens: int,
    case: dict[str, Any],
) -> JudgeResult:
    system = (
        "You are a very strict evaluation judge for rewrite quality. "
        "Return a single JSON object with keys: "
        "scores (object with keys: faithfulness, clarity, fluency, instruction_following), "
        "overall (1-5), rationale (short, 2-4 sentences). "
        "Scores must be integers from 1 to 5. "
        "Scoring rubric (apply strictly): "
        "faithfulness=5 only if all facts, numbers, names, dates are preserved; "
        "faithfulness<=3 if any factual detail or number is altered or dropped. "
        "clarity=5 only if significantly clearer; 3 if similar; 1-2 if worse. "
        "fluency=5 only if polished and natural; 3 if acceptable; 1-2 if awkward. "
        "instruction_following=5 only if fully meets instruction; "
        "3 if partially meets; 1-2 if misses key constraints. "
        "Be conservative and penalize any hallucination or omissions."
    )

    user_payload = {
        "instruction": case.get("instruction", ""),
        "original_text": case.get("original_text", ""),
        "candidate_text": case.get("candidate_text", ""),
        "notes": case.get("notes", ""),
    }

    request_body = json.dumps(
        {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": 0.0,
            "system": system,
            "messages": [
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                }
            ],
        },
        ensure_ascii=False,
    ).encode("utf-8")

    req = urllib.request.Request(
        base_url,
        data=request_body,
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8") if exc.fp else str(exc)
        raise RuntimeError(f"anthropic http error: {detail}") from exc
    except Exception as exc:
        raise RuntimeError(f"anthropic request failed: {exc}") from exc

    payload = json.loads(raw)
    text = _extract_text(payload)
    data = _extract_json(text)

    scores = data.get("scores", {})
    if not isinstance(scores, dict):
        scores = {}
    clean_scores: dict[str, int] = {}
    for key in ("faithfulness", "clarity", "fluency", "instruction_following"):
        try:
            clean_scores[key] = int(scores.get(key, 0))
        except Exception:
            clean_scores[key] = 0
    overall = int(data.get("overall", 0))
    rationale = str(data.get("rationale", "")).strip()

    return JudgeResult(
        case_id=str(case.get("id", "")),
        scores=clean_scores,
        overall=overall,
        rationale=rationale,
        raw=data,
    )


def _load_cases(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        return payload.get("cases", [])
    if isinstance(payload, list):
        return payload
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description="LLM-as-a-judge evaluator")
    parser.add_argument(
        "--cases",
        type=Path,
        default=Path("docs") / "judge_cases.json",
        help="Path to judge cases (json).",
    )
    parser.add_argument("--out", type=Path, default=None, help="Optional output json file.")
    parser.add_argument("--csv", type=Path, default=None, help="Optional output csv file.")
    args = parser.parse_args()

    settings = load_settings()
    api_key = os.getenv("HAW_ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        print("Missing HAW_ANTHROPIC_API_KEY", file=sys.stderr)
        return 2

    model = os.getenv("HAW_ANTHROPIC_MODEL", DEFAULT_MODEL)
    base_url = os.getenv("HAW_ANTHROPIC_BASE_URL", DEFAULT_BASE_URL)
    timeout = float(os.getenv("HAW_ANTHROPIC_TIMEOUT_SEC", str(DEFAULT_TIMEOUT_SEC)))
    max_tokens = int(os.getenv("HAW_ANTHROPIC_MAX_TOKENS", str(DEFAULT_MAX_TOKENS)))

    cases = _load_cases(args.cases)
    if not cases:
        print("No cases found.", file=sys.stderr)
        return 1

    results: list[dict[str, Any]] = []
    totals: dict[str, int] = {"faithfulness": 0, "clarity": 0, "fluency": 0, "instruction_following": 0, "overall": 0}
    count = 0

    for case in cases:
        count += 1
        result = _judge_case(
            model=model,
            base_url=base_url,
            api_key=api_key,
            timeout=timeout,
            max_tokens=max_tokens,
            case=case,
        )
        results.append(
            {
                "id": result.case_id,
                "scores": result.scores,
                "overall": result.overall,
                "rationale": result.rationale,
                "raw": result.raw,
            }
        )
        for key in ("faithfulness", "clarity", "fluency", "instruction_following"):
            totals[key] += result.scores.get(key, 0)
        totals["overall"] += result.overall
        print(f"[{count}/{len(cases)}] {result.case_id} overall={result.overall}")
        time.sleep(0.2)

    avg = {key: (totals[key] / count if count else 0) for key in totals}
    summary = {"count": count, "average": avg, "results": results}

    if args.out:
        args.out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.csv:
        lines = ["id,faithfulness,clarity,fluency,instruction_following,overall,rationale"]
        for item in results:
            scores = item.get("scores", {})
            rationale = str(item.get("rationale", "")).replace("\n", " ").replace("\r", " ").replace('"', "'")
            lines.append(
                f"{item.get('id','')},"
                f"{scores.get('faithfulness',0)},"
                f"{scores.get('clarity',0)},"
                f"{scores.get('fluency',0)},"
                f"{scores.get('instruction_following',0)},"
                f"{item.get('overall',0)},"
                f"\"{rationale}\""
            )
        args.csv.write_text("\n".join(lines), encoding="utf-8")
    else:
        print(json.dumps(summary["average"], ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
