"""ArthNiti — LLM client with NVIDIA Nemotron Ultra primary + Gemma fallback.

Wraps the OpenAI SDK so the rest of the codebase doesn't need to know
which provider is active. The interface is `complete(prompt, ...)` which
translates to `chat.completions.create` under the hood.

Primary: NVIDIA Nemotron Ultra via NVIDIA Integrate API.
  Key:  NVIDIA_API_KEY
  URL:  https://integrate.api.nvidia.com/v1
  Model: nvidia/nemotron-3-ultra-550b-a55b

Fallback: Google Gemma 4 31B via NVIDIA Integrate API.
  Key:  NVIDIA_FALLBACK_API_KEY (defaults to NVIDIA_API_KEY if unset)
  URL:  https://integrate.api.nvidia.com/v1
  Model: google/gemma-4-31b-it

Fix 3 & Fix 4 Notes (Temperature and Max Tokens):
- Empirical testing on NVIDIA NIM (`nvidia/nemotron-3-ultra-550b-a55b`) confirms
  that `temperature=0.0` is supported without raising 400 errors. The silent
  override to `1.0` has been removed so deterministic financial explanations work as expected.
- For `max_tokens < 1024` (e.g., ~150 word MSME credit summaries or JSON extraction),
  reasoning mode (`enable_thinking`) is disabled so the caller's requested `max_tokens`
  ceiling is strictly respected without internal thinking consuming token budget.
- For larger token requests (`max_tokens >= 1024`), thinking mode is enabled with a bounded
  reasoning budget to prevent 16k runaway loops.
"""

import logging
from typing import Optional, Union, Tuple

from openai import AsyncOpenAI

from backend.config import get_settings

_settings = get_settings()
logger = logging.getLogger(__name__)


class LLMClient:
    """Unified async LLM client.

    Primary: NVIDIA Nemotron Ultra via NVIDIA Integrate API.
    Fallback: Google Gemma 4 31B via NVIDIA Integrate API.
    """

    def __init__(self):
        self._primary: Optional[AsyncOpenAI] = None
        self._fallback: Optional[AsyncOpenAI] = None

        if _settings.NVIDIA_API_KEY:
            self._primary = AsyncOpenAI(
                api_key=_settings.NVIDIA_API_KEY,
                base_url=_settings.NVIDIA_BASE_URL,
            )
        else:
            logger.warning(
                "NVIDIA_API_KEY not set — primary LLM unavailable. "
                "Set it in .env (https://build.nvidia.com). "
                "Falling back to fallback model if configured."
            )

        if _settings.NVIDIA_FALLBACK_API_KEY:
            self._fallback = AsyncOpenAI(
                api_key=_settings.NVIDIA_FALLBACK_API_KEY,
                base_url=_settings.NVIDIA_FALLBACK_BASE_URL,
            )
        else:
            logger.warning(
                "NVIDIA_FALLBACK_API_KEY not set — fallback LLM unavailable. "
                "Set it in .env (https://build.nvidia.com)."
            )

    async def complete(
        self,
        prompt: str,
        max_tokens: int = 400,
        temperature: float = 0.0,
        model: Optional[str] = None,
        return_model: bool = False,
    ) -> Union[str, Tuple[str, str]]:
        """Return the assistant's text response.

        Args:
            prompt: User prompt text.
            max_tokens: Maximum tokens to generate.
            temperature: 0.0 = deterministic, higher = creative.
            model: Override the default model string.
            return_model: If True, return (text, model_string) tuple.
        """
        messages = [{"role": "user", "content": prompt}]

        # Try primary (NVIDIA Nemotron Ultra)
        if self._primary:
            actual_model = model or _settings.NVIDIA_PRIMARY_MODEL
            try:
                if "nemotron" in actual_model.lower() or "nvidia" in _settings.NVIDIA_BASE_URL.lower():
                    kwargs = {
                        "model": actual_model,
                        "messages": messages,
                        "temperature": temperature,
                        "top_p": 0.95,
                        "max_tokens": max_tokens,
                        "stream": True,
                    }
                    if max_tokens >= 1024:
                        kwargs["extra_body"] = {
                            "chat_template_kwargs": {"enable_thinking": True},
                            "reasoning_budget": min(max_tokens // 2, 4096),
                        }
                    else:
                        kwargs["extra_body"] = {
                            "chat_template_kwargs": {"enable_thinking": False},
                        }
                    resp = await self._primary.chat.completions.create(**kwargs)
                    content_chunks = []
                    async for chunk in resp:
                        if not chunk.choices:
                            continue
                        delta_content = chunk.choices[0].delta.content
                        if delta_content is not None:
                            content_chunks.append(delta_content)
                    content = "".join(content_chunks)
                    return (content, actual_model) if return_model else content
                else:
                    resp = await self._primary.chat.completions.create(
                        model=actual_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                    )
                    content = resp.choices[0].message.content or ""
                    return (content, actual_model) if return_model else content
            except Exception as e:
                logger.warning(f"Primary LLM request failed: {e}")

        # Try fallback (Google Gemma 4 31B)
        if self._fallback:
            actual_model = model or _settings.NVIDIA_FALLBACK_MODEL
            try:
                if "gemma" in actual_model.lower() or "nemotron" in actual_model.lower() or "nvidia" in _settings.NVIDIA_FALLBACK_BASE_URL.lower():
                    kwargs = {
                        "model": actual_model,
                        "messages": messages,
                        "temperature": temperature,
                        "top_p": 0.95,
                        "max_tokens": max_tokens,
                        "stream": True,
                    }
                    if max_tokens >= 1024:
                        kwargs["extra_body"] = {
                            "chat_template_kwargs": {"enable_thinking": True},
                        }
                    else:
                        kwargs["extra_body"] = {
                            "chat_template_kwargs": {"enable_thinking": False},
                        }
                    resp = await self._fallback.chat.completions.create(**kwargs)
                    content_chunks = []
                    async for chunk in resp:
                        if not chunk.choices:
                            continue
                        delta_content = chunk.choices[0].delta.content
                        if delta_content is not None:
                            content_chunks.append(delta_content)
                    content = "".join(content_chunks)
                    return (content, actual_model) if return_model else content
                else:
                    resp = await self._fallback.chat.completions.create(
                        model=actual_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                    )
                    content = resp.choices[0].message.content or ""
                    return (content, actual_model) if return_model else content
            except Exception as e:
                logger.warning(f"Fallback LLM request failed: {e}")

        raise RuntimeError(
            "No LLM provider available. "
            "Set NVIDIA_API_KEY (primary) or NVIDIA_FALLBACK_API_KEY (fallback) in .env."
        )


# Singleton — initialized on first import, reused across requests
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """FastAPI dependency factory."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
