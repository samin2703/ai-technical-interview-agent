import os

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()

AIAND_BASE_URL = os.getenv("AIAND_BASE_URL", "https://api.aiand.com/v1")
AIAND_API_KEY = os.getenv("AIAND_API_KEY") or os.getenv("OPENAI_API_KEY")
AIAND_MODEL = os.getenv("AIAND_MODEL", "openai/gpt-oss-120b")

if not AIAND_API_KEY:
    raise RuntimeError(
        "Missing API key. Set AIAND_API_KEY (preferred) or OPENAI_API_KEY in backend/.env."
    )

client = OpenAI(
    base_url=AIAND_BASE_URL,
    api_key=AIAND_API_KEY,
)
