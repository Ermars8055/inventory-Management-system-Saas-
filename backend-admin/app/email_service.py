"""Lightweight email service for admin backend — shares same SMTP config."""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_NAME = os.getenv("FROM_NAME", "StockPilot")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)


def send_email(to: str, subject: str, html_body: str):
    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL SKIP] No SMTP creds. Would send to {to}: {subject}")
        return
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to, msg.as_string())
        print(f"[EMAIL SENT] {to}: {subject}")
    except Exception as e:
        print(f"[EMAIL ERROR] {to}: {e}")
