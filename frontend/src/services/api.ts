const API_BASE_URL = "http://127.0.0.1:8000";

export async function startInterview(
  role: string,
  level: string
) {

  const response = await fetch(
    `${API_BASE_URL}/interview/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role,
        level
      })
    }
  );

  return response.json();
}

export async function submitAnswer(
  sessionId: string,
  answer: string
) {

  const response = await fetch(
    `${API_BASE_URL}/interview/answer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session_id: sessionId,
        answer: answer
      })
    }
  );

  return response.json();
}