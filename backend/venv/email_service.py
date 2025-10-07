import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import random
import string
from typing import Optional

class EmailService:
    def __init__(self):
        # Email configuration - using Gmail SMTP
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = os.getenv("SMTP_EMAIL", "your-email@gmail.com")
        self.sender_password = os.getenv("SMTP_PASSWORD", "your-app-password")
        
        
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
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = "🔬 Science Pioneers - Email Verification"
            msg['From'] = self.sender_email
            msg['To'] = to_email
            
            # Create HTML content
            html_content = self.create_verification_email(username, verification_code)
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Connect to SMTP server and send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Enable TLS encryption
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            print(f"Verification email sent to {to_email}")
            return True
            
        except Exception as e:
            print(f"Error sending email to {to_email}: {str(e)}")
            return False
    
    async def send_account_deletion_email(self, to_email: str, username: str, verification_code: str) -> bool:
        """Send account deletion verification email to user"""
        try:
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
            
            # Connect to SMTP server and send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Enable TLS encryption
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            print(f"Account deletion verification email sent to {to_email}")
            return True
            
        except Exception as e:
            print(f"Error sending account deletion email to {to_email}: {str(e)}")
            return False
    
    def send_notification_email(self, to_email: str, subject: str, body: str) -> bool:
        """Send notification email to user"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.sender_email
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
            
            # Connect to SMTP server and send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Enable TLS encryption
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            print(f"Notification email sent to {to_email}")
            return True
            
        except Exception as e:
            print(f"Error sending notification email to {to_email}: {str(e)}")
            return False

# Create global email service instance
email_service = EmailService()
