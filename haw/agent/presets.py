from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Preset:
    key: str
    label: str
    template: str


PRESETS: list[Preset] = [
    Preset(
        key="custom",
        label="Custom",
        template="",
    ),
    Preset(
        key="tone_formal",
        label="Tone: Formal",
        template=(
            "다음 텍스트를 격식 있고 공식적인 문체로 다듬어 주세요.\n"
            "의미, 사실관계, 수치, 고유명사, 인용, 날짜는 유지하세요.\n"
            "불필요한 수사어를 줄이고 명확하고 단정한 표현을 사용하세요.\n"
            "문장 길이는 크게 바꾸지 말고, 항목/번호/목록 구조는 유지하세요."
        ),
    ),
    Preset(
        key="tone_friendly",
        label="Tone: Friendly",
        template=(
            "다음 텍스트를 친근하고 자연스러운 문체로 다듬어 주세요.\n"
            "의미, 사실관계, 수치, 고유명사는 유지하세요.\n"
            "너무 가벼운 표현은 피하고, 이해하기 쉬운 말로 정리하세요.\n"
            "문장 구조는 유지하되 읽기 흐름을 개선하세요."
        ),
    ),
    Preset(
        key="shorter",
        label="Length: Shorter",
        template=(
            "다음 텍스트를 핵심만 남겨 더 짧고 간결하게 줄여 주세요.\n"
            "중복, 장황한 표현, 수식어를 제거하세요.\n"
            "의미, 사실관계, 수치, 고유명사, 약어는 유지하세요.\n"
            "목록/번호 구조는 유지하고, 문장 수는 줄이되 정보 손실은 최소화하세요.\n"
            "가능하면 전체 길이를 20~30% 줄이고, 같은 의미의 문장은 합쳐 주세요."
        ),
    ),
    Preset(
        key="longer",
        label="Length: Longer",
        template=(
            "다음 텍스트의 의미는 유지하되 더 자세히 풀어서 작성해 주세요.\n"
            "핵심 용어를 짧게 설명하고, 근거/배경을 1~2문장 덧붙이세요.\n"
            "사실관계, 수치, 고유명사는 변경하지 마세요.\n"
            "구조는 유지하되 문장 수를 적절히 늘리세요."
        ),
    ),
    Preset(
        key="grammar",
        label="Grammar Fix",
        template=(
            "맞춤법과 문법 오류를 교정해 주세요.\n"
            "의미, 사실관계, 수치, 고유명사, 문서 구조는 유지하세요.\n"
            "불필요한 문체 변경은 하지 말고, 오류 수정에만 집중하세요."
        ),
    ),
    Preset(
        key="summary",
        label="Summary",
        template=(
            "다음 텍스트를 2~3문장으로 요약해 주세요.\n"
            "핵심 결론과 주요 근거만 남기고 세부 설명은 줄이세요.\n"
            "중요한 수치, 날짜, 고유명사는 유지하세요."
        ),
    ),
]


PRESET_BY_KEY = {preset.key: preset for preset in PRESETS}


def resolve_prompt(*, preset_key: str, user_prompt: str) -> tuple[str, str]:
    preset = PRESET_BY_KEY.get(preset_key, PRESET_BY_KEY["custom"])
    base = preset.template.strip()
    user = user_prompt.strip()
    if base and user:
        return f"{base}\n추가 요청: {user}", preset.label
    if base:
        return base, preset.label
    return user, preset.label
