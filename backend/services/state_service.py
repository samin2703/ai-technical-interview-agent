import uuid

from models.interview_state import InterviewState

sessions = {}


def create_session(role, level):

    session_id = str(uuid.uuid4())

    state = InterviewState(
        session_id=session_id,
        role=role,
        level=level
    )

    sessions[session_id] = state

    return state


def get_session(session_id):

    return sessions.get(session_id)