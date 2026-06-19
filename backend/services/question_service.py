import json


def load_questions(role: str):

    file_name = role.lower().replace(" ", "_")

    try:

        with open(
            f"question_bank/{file_name}.json",
            "r",
            encoding="utf-8"
        ) as f:

            return json.load(f)

    except FileNotFoundError:

        return None


def get_first_question(role: str, level: str):
    questions = load_questions(role)

    if questions is None:
        return None
    
    filtered_questions = [
        q for q in questions
        if q["difficulty"] == level
    ]

    return filtered_questions[0]


def get_next_question(
    role: str,
    level: str,
    questions_asked: list
):
    questions = load_questions(role)
    
    if questions is None:
        return None
    

    filtered_questions = [
        q for q in questions
        if q["difficulty"] == level
    ]

    for question in filtered_questions:

        if question["question"] not in questions_asked:

            return question

    return None

def get_question_details(
    role: str,
    level: str,
    question_text: str
):

    questions = load_questions(role)

    for question in questions:

        if (
            question["difficulty"] == level
            and question["question"] == question_text
        ):
            return question

    return None