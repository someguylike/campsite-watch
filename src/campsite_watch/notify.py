from __future__ import annotations

from email.message import EmailMessage
import json
import smtplib
from urllib.request import Request, urlopen

from .config import NotifyConfig


def notify(config: NotifyConfig, subject: str, body: str) -> None:
    errors: list[str] = []
    for url in config.ntfy_urls:
        try:
            _post(url, body.encode("utf-8"), {"Title": subject})
        except Exception as error:
            errors.append(f"ntfy {url}: {error}")

    for url in config.webhook_urls:
        try:
            payload = json.dumps({"text": f"{subject}\n{body}"}).encode("utf-8")
            _post(url, payload, {"Content-Type": "application/json"})
        except Exception as error:
            errors.append(f"webhook {url}: {error}")

    if config.smtp_host and config.smtp_from and config.smtp_to:
        try:
            _send_email(config, subject, body)
        except Exception as error:
            errors.append(f"smtp: {error}")

    if errors:
        raise RuntimeError("; ".join(errors))


def _post(url: str, payload: bytes, headers: dict[str, str]) -> None:
    request = Request(url, data=payload, headers=headers, method="POST")
    with urlopen(request, timeout=20) as response:
        response.read()


def _send_email(config: NotifyConfig, subject: str, body: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = config.smtp_from
    message["To"] = ", ".join(config.smtp_to)
    message.set_content(body)

    with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=30) as smtp:
        smtp.starttls()
        if config.smtp_username and config.smtp_password:
            smtp.login(config.smtp_username, config.smtp_password)
        smtp.send_message(message)

