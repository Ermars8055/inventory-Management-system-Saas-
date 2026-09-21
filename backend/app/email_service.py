"""
Email service using Gmail SMTP.
All emails sent from a single utility to keep things clean.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_NAME = os.getenv("FROM_NAME", "StockPilot")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
APP_URL = os.getenv("APP_URL", "https://stockpilot.ermarscastar.in")


def _send(to: str, subject: str, html_body: str) -> bool:
    """Send an email via Gmail SMTP. Returns True if sent, False if skipped/failed."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL SKIP] No SMTP creds. Would send to {to}: {subject}")
        return False

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
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {to}: {e}")
        return False


def _wrap(content: str) -> str:
    """Wrap content in a styled email template."""
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: #0f172a; color: white; font-weight: 800; font-size: 18px; padding: 8px 16px; border-radius: 10px; letter-spacing: -0.5px;">
                StockPilot
            </div>
        </div>
        {content}
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
            <p>StockPilot — Inventory Management SaaS</p>
            <p>This is an automated message. Please do not reply directly.</p>
        </div>
    </div>
    """


# ─── Email templates ─────────────────────────────────────────────────────────

def send_welcome(to: str, name: str, org_name: str, subdomain: Optional[str] = None):
    domain = f"https://{subdomain}.stockpilot.ermarscastar.in" if subdomain else APP_URL
    html = _wrap(f"""
        <h2 style="color: #0f172a; font-size: 24px; margin: 0 0 8px;">Welcome to StockPilot!</h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
            Hi {name}, your organization <strong>{org_name}</strong> is ready.
        </p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">Your app URL</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600;">
                <a href="{domain}" style="color: #4f46e5; text-decoration: none;">{domain}</a>
            </p>
        </div>
        <a href="{domain}/login" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Go to Dashboard
        </a>
    """)
    return _send(to, f"Welcome to StockPilot — {org_name}", html)


def send_password_reset(to: str, name: str, reset_url: str):
    html = _wrap(f"""
        <h2 style="color: #0f172a; font-size: 24px; margin: 0 0 8px;">Reset your password</h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
            Hi {name}, we received a request to reset your password. Click the button below to set a new one.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{reset_url}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                Reset Password
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">
            This link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
    """)
    _send(to, "Reset your StockPilot password", html)


def send_invoice_reminder(to: str, name: str, org_name: str, amount: float, period: str, due_date: str):
    html = _wrap(f"""
        <h2 style="color: #0f172a; font-size: 24px; margin: 0 0 8px;">Invoice Reminder</h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
            Hi {name}, your invoice for <strong>{org_name}</strong> is due.
        </p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b; font-size: 13px;">Period</span>
                <span style="font-weight: 600; color: #0f172a;">{period}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b; font-size: 13px;">Amount</span>
                <span style="font-weight: 700; font-size: 18px; color: #0f172a;">₹{amount:,.0f}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 13px;">Due Date</span>
                <span style="font-weight: 600; color: #dc2626;">{due_date}</span>
            </div>
        </div>
        <a href="{APP_URL}/settings/subscription" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Pay Now
        </a>
    """)
    _send(to, f"Invoice due — ₹{amount:,.0f} for {period}", html)


def send_ticket_reply(to: str, name: str, ticket_subject: str, reply_message: str, replier_name: str):
    html = _wrap(f"""
        <h2 style="color: #0f172a; font-size: 24px; margin: 0 0 8px;">New reply on your ticket</h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
            Hi {name}, there's a new reply on your support ticket.
        </p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                {ticket_subject}
            </p>
            <p style="margin: 0 0 8px; font-weight: 600; color: #0f172a; font-size: 13px;">{replier_name}:</p>
            <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.5;">{reply_message}</p>
        </div>
        <a href="{APP_URL}/support" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            View Ticket
        </a>
    """)
    _send(to, f"Reply on: {ticket_subject}", html)
