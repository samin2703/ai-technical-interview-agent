from services.followup_service import generate_followup

followup = generate_followup(
    question="What is overfitting?",
    answer="A model memorizes training data.",
    evaluation={
        "technical_accuracy": 6
    }
)

print(followup)