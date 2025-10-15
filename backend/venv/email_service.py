import smtplib
import os
import base64
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import random
import string
from typing import Optional
# Removed database imports to fix circular import issue

class EmailService:
    def __init__(self):
        # Email configuration loaded from environment variables
        self.smtp_server = os.getenv('SMTP_SERVER') or os.getenv('SMTP_HOST')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.sender_email = os.getenv('SMTP_USERNAME')
        self.sender_password = os.getenv('SMTP_PASSWORD')
        self.smtp_use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        self.email_from_name = os.getenv('EMAIL_FROM_NAME', 'Science Pioneers')
        self.email_from_address = os.getenv('EMAIL_FROM_ADDRESS', self.sender_email)
    
    def is_configured(self):
        """Check if email service is properly configured"""
        return bool(self.smtp_server and self.sender_email and self.sender_password)
        
        
    def generate_verification_code(self) -> str:
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=6))
    
    def get_verification_expiry(self) -> datetime:
        """Get verification code expiry time (15 minutes from now)"""
        return datetime.utcnow() + timedelta(minutes=15)
    
    def create_verification_email(self, username: str, verification_code: str) -> str:
        """Create HTML email template for verification"""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .verification-code {{ 
                    background-color: #007bff; 
                    color: white; 
                    font-size: 24px; 
                    font-weight: bold; 
                    padding: 15px; 
                    text-align: center; 
                    border-radius: 5px; 
                    margin: 20px 0;
                    letter-spacing: 3px;
                }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔬 Science Pioneers</h1>
                    <h2>Email Verification</h2>
                </div>
                <div class="content">
                    <h3>Hello {username}!</h3>
                    <p>Welcome to Science Pioneers! To complete your registration, please verify your email address.</p>
                    
                    <p>Your verification code is:</p>
                    <div class="verification-code">{verification_code}</div>
                    
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This code will expire in 15 minutes</li>
                        <li>Enter this code on the verification page</li>
                        <li>If you didn't create an account, please ignore this email</li>
                    </ul>
                    
                    <p>If you have any questions, feel free to contact us!</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from Science Pioneers</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content
    
    def create_account_deletion_email(self, username: str, verification_code: str) -> str:
        """Create HTML email template for account deletion verification"""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .verification-code {{ 
                    background-color: #dc2626; 
                    color: white; 
                    font-size: 24px; 
                    font-weight: bold; 
                    padding: 15px; 
                    text-align: center; 
                    border-radius: 5px; 
                    margin: 20px 0;
                    letter-spacing: 3px;
                }}
                .warning {{ 
                    background-color: #fef2f2; 
                    border: 1px solid #fecaca; 
                    color: #dc2626; 
                    padding: 15px; 
                    border-radius: 5px; 
                    margin: 20px 0;
                }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔬 Science Pioneers</h1>
                    <h2>Account Deletion Verification</h2>
                </div>
                <div class="content">
                    <h3>Hello {username}!</h3>
                    <p>You have requested to delete your Science Pioneers account. To confirm this action, please use the verification code below.</p>
                    
                    <div class="warning">
                        <strong>⚠️ WARNING:</strong> This action cannot be undone. Your account will be permanently deleted.
                    </div>
                    
                    <p>Your verification code is:</p>
                    <div class="verification-code">{verification_code}</div>
                    
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This code will expire in 15 minutes</li>
                        <li>Enter this code on the account deletion page</li>
                        <li>If you didn't request account deletion, please ignore this email</li>
                        <li>Your content will remain but will be attributed to "[deleted user]"</li>
                    </ul>
                    
                    <p>If you have any questions, feel free to contact us!</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from Science Pioneers</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content
    
    async def send_verification_email(self, to_email: str, username: str, verification_code: str) -> bool:
        """Send verification email to user"""
        try:
            print(f"DEBUG: Attempting to send verification email to {to_email}")
            
            # Create HTML content
            html_content = self.create_verification_email(username, verification_code)
            
            # Try SendGrid API first (more reliable)
            print("DEBUG: Trying SendGrid REST API...")
            success = await self.send_email_via_sendgrid_api(
                to_email=to_email,
                subject="🔬 Science Pioneers - Email Verification",
                html_content=html_content
            )
            
            if success:
                print(f"SUCCESS: Verification email sent via SendGrid API to {to_email}")
                return True
            
            # Fallback to SMTP if API fails
            print("DEBUG: SendGrid API failed, trying SMTP fallback...")
            return await self._send_verification_email_smtp(to_email, username, verification_code, html_content)
            
        except Exception as e:
            print(f"ERROR: Email sending failed: {e}")
            return False
    
    async def _send_verification_email_smtp(self, to_email: str, username: str, verification_code: str, html_content: str) -> bool:
        """Fallback SMTP method for sending verification email"""
        try:
            # Validate SMTP settings before attempting connection
            if not self.sender_email or not self.sender_password or not self.smtp_server:
                print(f"SMTP not configured: email={bool(self.sender_email)}, password={bool(self.sender_password)}, server={self.smtp_server}")
                return False
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = "🔬 Science Pioneers - Email Verification"
            msg['From'] = self.sender_email
            msg['To'] = to_email
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Connect to SMTP server with timeout (10 seconds max)
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30) as server:
                server.starttls()  # Enable TLS encryption
                # Use SendGrid's authentication method
                if self.smtp_username == 'apikey':
                    server.login(self.smtp_username, self.sender_password)  # SendGrid: username='apikey', password=API_key
                else:
                    server.login(self.sender_email, self.sender_password)  # Regular SMTP
                server.send_message(msg)
            
            print(f"SUCCESS: Email sent via SMTP to {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            print(f"SMTP Authentication failed: {e}")
            return False
        except smtplib.SMTPConnectError as e:
            print(f"SMTP Connection failed: {e}")
            return False
        except smtplib.SMTPException as e:
            print(f"SMTP Error: {e}")
            return False
        except Exception as e:
            print(f"SMTP Email sending failed: {e}")
            return False
    
    async def send_account_deletion_email(self, to_email: str, username: str, verification_code: str) -> bool:
        """Send account deletion verification email to user"""
        try:
            # Validate SMTP settings before attempting connection
            if not self.sender_email or not self.sender_password or not self.smtp_server:
                print(f"Email service not configured: email={bool(self.sender_email)}, password={bool(self.sender_password)}, server={self.smtp_server}")
                return False
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = "🔬 Science Pioneers - Account Deletion Verification"
            msg['From'] = self.sender_email
            msg['To'] = to_email
            
            # Create HTML content
            html_content = self.create_account_deletion_email(username, verification_code)
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Connect to SMTP server with timeout (10 seconds max)
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30) as server:
                if self.smtp_use_tls:
                    server.starttls()  # Enable TLS encryption
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            print(f"Account deletion email sent successfully to {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            print(f"SMTP Authentication failed: {e}")
            return False
        except smtplib.SMTPConnectError as e:
            print(f"SMTP Connection failed: {e}")
            return False
        except smtplib.SMTPException as e:
            print(f"SMTP Error: {e}")
            return False
        except Exception as e:
            print(f"Email sending failed: {e}")
            return False
    
    # Removed refresh_settings method - using environment variables now
    
    async def send_email_via_sendgrid_api(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using SendGrid REST API (more reliable than SMTP)"""
        try:
            # Get SendGrid API key from environment
            api_key = os.getenv('SENDGRID_API_KEY', self.sender_password)
            if not api_key:
                print("ERROR: SendGrid API key not found")
                return False
            
            # SendGrid API endpoint
            url = "https://api.sendgrid.com/v3/mail/send"
            
            # Headers
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            # Email data
            data = {
                "personalizations": [
                    {
                        "to": [{"email": to_email}],
                        "subject": subject
                    }
                ],
                "from": {
                    "email": self.sender_email or "noreply@sciencepioneers.com",
                    "name": self.email_from_name or "Science Pioneers"
                },
                "content": [
                    {
                        "type": "text/html",
                        "value": html_content
                    }
                ]
            }
            
            print(f"DEBUG: Sending email via SendGrid API to {to_email}")
            print(f"DEBUG: Using API key: {api_key[:10]}...")
            print(f"DEBUG: From email: {self.sender_email}")
            
            # Send request
            response = requests.post(url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 202:
                print(f"SUCCESS: Email sent via SendGrid API to {to_email}")
                return True
            else:
                print(f"ERROR: SendGrid API failed with status {response.status_code}")
                print(f"ERROR: Response: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            print("ERROR: SendGrid API request timed out")
            return False
        except requests.exceptions.RequestException as e:
            print(f"ERROR: SendGrid API request failed: {e}")
            return False
        except Exception as e:
            print(f"ERROR: SendGrid API error: {e}")
            return False
    
    def send_notification_email(self, to_email: str, subject: str, body: str) -> bool:
        """Send notification email to user"""
        try:
            # Validate SMTP settings before attempting connection
            if not self.sender_email or not self.sender_password or not self.smtp_server:
                print(f"SMTP not configured for notification: email={bool(self.sender_email)}, password={bool(self.sender_password)}, server={self.smtp_server}")
                return False
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.email_from_name} <{self.sender_email}>" if self.email_from_name else self.sender_email
            msg['To'] = to_email
            
            # Create HTML content
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #2d7a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1>🔬 Science Pioneers</h1>
                    </div>
                    <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
                        <h2>Notification</h2>
                        <p>{body}</p>
                        <p>Visit <a href="http://localhost:3000">SciencePioneers</a> to see more!</p>
                        <p>Best regards,<br>SciencePioneers Team</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Connect to SMTP server with timeout (10 seconds max)
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30) as server:
                if self.smtp_use_tls:
                    server.starttls()  # Enable TLS encryption
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            print(f"DEBUG: Notification email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"ERROR: Notification email failed: {e}")
            print(f"DEBUG: SMTP settings - server: {self.smtp_server}, port: {self.smtp_port}, user: {self.sender_email}")
            return False

# Create global email service instance
email_service = EmailService()
