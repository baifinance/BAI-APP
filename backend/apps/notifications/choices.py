from django.db import models

class NotificationType(models.TextChoices):
    LOAN_STATUS = "loan_status", "Loan status"
    COMMUNICATION = "communication", "Communication"
    MFA = "mfa", "MFA"
    SYSTEM = "system", "System"
    