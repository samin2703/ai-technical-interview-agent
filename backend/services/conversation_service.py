from __future__ import annotations


def _current_question(state) -> str:
    if state.awaiting_followup and state.current_followup:
        return state.current_followup

    if state.questions_asked:
        return state.questions_asked[-1]

    return ""


def _normalized(message: str) -> str:
    return " ".join(message.lower().strip().split())


def classify_message(message: str) -> str:
    text = _normalized(message)

    if not text:
        return "empty"

    if any(
        phrase in text
        for phrase in (
            "repeat the question",
            "say that again",
            "repeat that",
            "question again",
            "ask that again",
            "what was the question",
            "could you repeat",
            "repeat please",
        )
    ):
        return "repeat"

    if any(
        phrase in text
        for phrase in (
            "clarify",
            "clarification",
            "what do you mean",
            "explain that",
            "can you explain",
            "in simple terms",
            "what should i focus on",
        )
    ):
        return "clarify"

    if any(
        phrase in text
        for phrase in (
            "hello",
            "hi",
            "hey",
            "good morning",
            "good afternoon",
            "good evening",
            "nice to meet you",
        )
    ):
        return "greeting"

    if any(
        phrase in text
        for phrase in (
            "who are you",
            "tell me about yourself",
            "what do you do",
        )
    ):
        return "introduction"

    if any(
        phrase in text
        for phrase in (
            "thanks",
            "thank you",
            "got it",
            "sounds good",
            "understood",
            "okay",
            "ok",
        )
    ):
        return "acknowledgement"

    if any(
        phrase in text
        for phrase in (
            "let's begin",
            "lets begin",
            "start interview",
            "i'm ready",
            "im ready",
            "ready to start",
            "let's go",
            "continue",
            "next",
        )
    ):
        return "transition"

    if len(text.split()) <= 4:
        return "acknowledgement"

    return "smalltalk"


def _simple_reply(intent: str, current_question: str, role: str) -> str:
    if intent == "repeat":
        return f"Of course. Here it is again: {current_question}"

    if intent == "clarify":
        return "Sure. Focus on your approach, tradeoffs, and any edge cases you would watch for."

    if intent == "greeting":
        return f"Hi, I'm your interviewer for this {role} session. We'll start with a quick warm-up, then move into the scored round."

    if intent == "introduction":
        return "I'll guide the interview, ask a few warm-up questions first, and then move into the main technical round."

    if intent == "acknowledgement":
        return "Got it."

    if intent == "transition":
        return "Alright, let's continue."

    return "Thanks. Let's keep going."


def opening_message(role: str, level: str) -> str:
    return f"Hi, I'm your interviewer for this {role} session. We'll start with a quick warm-up, then move into the scored technical round."


def closing_message(role: str, level: str) -> str:
    return "Thanks for your time. I'll take you to the report now."


def transition_message(stage: str, role: str, current_question: str) -> str:
    seed = sum(ord(char) for char in current_question.strip()) if current_question else 0

    if stage == "followup":
        followup_messages = [
            "Thanks. I'd like to explore that a bit more.",
            "Alright, let me ask one follow-up here.",
            "Good start. Let's look at that from another angle.",
            "Thanks. I want to understand your thinking a little more.",
        ]
        return followup_messages[seed % len(followup_messages)]

    if stage == "warmup":
        warmup_messages = [
            "Thanks. Let's do one more warm-up question.",
            "Great. I have another quick warm-up for you.",
            "Nice. One last warm-up before we move on.",
        ]
        return warmup_messages[seed % len(warmup_messages)]

    if stage == "next":
        next_messages = [
            "Great. Let's move to the next question.",
            "Alright, here's the next one.",
            "Sounds good. Let's continue.",
            "Okay, let's keep going.",
        ]
        return next_messages[seed % len(next_messages)]

    return "Alright, let's continue."


def reply_to_message(state, message: str) -> dict:
    intent = classify_message(message)
    current_question = _current_question(state)

    reply = _simple_reply(intent, current_question, state.role)

    if intent == "transition":
        state.conversation_stage = "technical"

    if intent in {"greeting", "introduction"} and state.conversation_stage == "opening":
        state.conversation_stage = "warmup"

    state.conversation_history.append(
        {
            "role": "user",
            "message": message,
            "intent": intent,
        }
    )
    state.conversation_history.append(
        {
            "role": "assistant",
            "message": reply,
            "intent": intent,
        }
    )

    response = {
        "reply": reply,
        "intent": intent,
        "stage": state.conversation_stage,
    }

    if intent == "repeat" and current_question:
        response["repeat_question"] = current_question

    return response
