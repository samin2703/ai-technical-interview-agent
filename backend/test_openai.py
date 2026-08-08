from services.ai_client import AIAND_MODEL, client

response = client.responses.create(
    model=AIAND_MODEL,
    input="Say hello in one sentence."
)

print(response.output_text)
