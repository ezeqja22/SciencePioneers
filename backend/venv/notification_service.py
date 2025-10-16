from sqlalchemy.orm import Session
from models import Notification, NotificationPreferences, User
from email_service import EmailService
# Removed push notification service import
from datetime import datetime
from typing import Optional

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()
    
    async def create_notification(
        self, 
        user_id: int, 
        notification_type: str, 
        title: str, 
        message: str
    ) -> Optional[Notification]:
        """Create a notification and send email if user has email notifications enabled"""
        try:
            # Get user's notification preferences
            preferences = self.db.query(NotificationPreferences).filter(
                NotificationPreferences.user_id == user_id
            ).first()
            
            # Create in-app notification only if user has in-app notifications enabled
            notification = None
            if preferences and self._should_create_in_app_notification(preferences, notification_type):
                notification = Notification(
                    user_id=user_id,
                    type=notification_type,
                    title=title,
                    message=message
                )
                self.db.add(notification)
                self.db.commit()
                self.db.refresh(notification)
            
            # Send email notification if enabled (independent of in-app notifications)
            print(f"DEBUG: Checking if should send email for user {user_id}, type {notification_type}")
            should_send = self._should_send_email(preferences, notification_type)
            print(f"DEBUG: Should send email: {should_send}")
            
            if should_send:
                # Email notification enabled
                user = self.db.query(User).filter(User.id == user_id).first()
                print(f"DEBUG: User found: {user is not None}, verified: {user.is_verified if user else 'N/A'}")
                
                if user and user.is_verified:
                    # User verified, sending email
                    print(f"DEBUG: User verified, proceeding with email")
                    # Create a temporary notification object for email purposes if no in-app notification was created
                    email_notification = notification if notification else type('Notification', (), {
                        'title': title,
                        'message': message,
                        'type': notification_type
                    })()
                    await self._send_email_notification(user, email_notification)
                else:
                    print(f"DEBUG: User not verified or not found, skipping email")
            else:
                print(f"DEBUG: Email sending disabled by preferences")
            
            # Push notifications removed
            
            # Return notification if created, or a success indicator if email was sent
            if notification:
                return notification
            elif self._should_send_email(preferences, notification_type):
                # Email was sent even if no in-app notification was created
                return "email_sent"
            else:
                return None
            
        except Exception as e:
            pass
            self.db.rollback()
            return None
    
    def _should_send_email(self, preferences: NotificationPreferences, notification_type: str) -> bool:
        """Check if email should be sent based on user preferences"""
        # Skip system-wide email setting check for now - only check user preferences
        # If no user preferences exist, default to sending emails
        if not preferences:
            return True  # If no user preferences, send email by default
        
        if notification_type == "like":
            return preferences.email_likes
        elif notification_type == "comment":
            return preferences.email_comments
        elif notification_type == "follow":
            return preferences.email_follows
        elif notification_type in ["forum_invitation", "forum_invitation_accepted"]:
            return preferences.email_forum_invitations
        elif notification_type in ["forum_join_request", "forum_join_request_accepted", "forum_join_request_declined"]:
            return preferences.email_forum_join_requests
        elif notification_type == "forum_deleted":
            return preferences.email_forum_deleted
        return False
    
    def _should_create_in_app_notification(self, preferences: NotificationPreferences, notification_type: str) -> bool:
        """Check if in-app notification should be created based on system settings and user preferences"""
        # First check system-wide in-app notification setting
        from models import SystemSettings
        system_in_app_enabled = self.db.query(SystemSettings).filter(
            SystemSettings.key == 'in_app_notifications_enabled'
        ).first()
        
        if not system_in_app_enabled or system_in_app_enabled.value != 'true':
            return False  # System-wide in-app notifications disabled
        
        # If system allows, check user preferences
        if notification_type == "like":
            return preferences.in_app_likes
        elif notification_type == "comment":
            return preferences.in_app_comments
        elif notification_type == "follow":
            return preferences.in_app_follows
        elif notification_type in ["forum_invitation", "forum_invitation_accepted", "forum_join_request", "forum_join_request_accepted", "forum_join_request_declined"]:
            return True  # Always show forum invitations and join requests in-app (required for Accept/Decline)
        elif notification_type == "forum_deleted":
            return preferences.in_app_forum_deleted
        return False
    
    async def _send_email_notification(self, user: User, notification: Notification):
        """Send email notification to user"""
        try:
            print(f"DEBUG: Attempting to send email notification to {user.email}")
            subject = f"SciencePioneers: {notification.title}"
            body = f"""
            Hi {user.username},
            
            {notification.message}
            
            Visit SciencePioneers to see more: http://localhost:3000
            
            Best regards,
            SciencePioneers Team
            """
            
            result = await self.email_service.send_notification_email(user.email, subject, body)
            print(f"DEBUG: Email notification result: {result}")
            
        except Exception as e:
            print(f"ERROR: Email notification failed: {e}")
            pass
    
    async def send_like_notification(self, user_id: int, liker_username: str, problem_title: str):
        """Send notification when someone likes a problem"""
        title = "Someone liked your problem!"
        message = f"{liker_username} liked your problem '{problem_title}'"
        return await self.create_notification(user_id, "like", title, message)
    
    async def send_comment_notification(self, user_id: int, commenter_username: str, problem_title: str):
        """Send notification when someone comments on a problem"""
        title = "New comment on your problem!"
        message = f"{commenter_username} commented on your problem '{problem_title}'"
        return await self.create_notification(user_id, "comment", title, message)
    
    async def send_follow_notification(self, user_id: int, follower_username: str):
        """Send notification when someone follows the user"""
        title = "New follower!"
        message = f"{follower_username} started following you"
        return await self.create_notification(user_id, "follow", title, message)
    
    async def send_forum_invitation_notification(self, user_id: int, inviter_username: str, forum_title: str, forum_id: int = None, invitation_id: int = None):
        """Send notification when invited to a forum"""
        title = "Forum Invitation"
        message = f"{inviter_username} invited you to join '{forum_title}'"
        
        # Create notification with data for Accept/Decline buttons
        notification = await self.create_notification(user_id, "forum_invitation", title, message)
        
        # Add data field for frontend buttons
        if notification and forum_id and invitation_id:
            notification.data = {
                "forum_id": forum_id,
                "invitation_id": invitation_id,
                "inviter_name": inviter_username,
                "forum_title": forum_title
            }
            self.db.commit()
        
        return notification
    
    async def send_forum_invitation_accepted_notification(self, user_id: int, invitee_username: str, forum_title: str):
        """Send notification when forum invitation is accepted"""
        title = "Invitation Accepted"
        message = f"{invitee_username} accepted your invitation to '{forum_title}'"
        return await self.create_notification(user_id, "forum_invitation_accepted", title, message)
    
    async def send_forum_join_request_notification(self, user_id: int, requester_username: str, forum_title: str, forum_id: int = None, request_id: int = None):
        """Send notification when someone requests to join a forum"""
        title = "Join Request"
        message = f"{requester_username} wants to join '{forum_title}'"
        
        # Create notification with data for Accept/Decline buttons
        notification = await self.create_notification(user_id, "forum_join_request", title, message)
        
        # Add data field for frontend buttons
        if notification and forum_id and request_id:
            notification.data = {
                "forum_id": forum_id,
                "request_id": request_id,
                "requester_name": requester_username,
                "forum_title": forum_title
            }
            self.db.commit()
        
        return notification
    
    async def send_forum_join_request_accepted_notification(self, user_id: int, forum_title: str):
        """Send notification when join request is accepted"""
        title = "Request Accepted"
        message = f"Your request to join '{forum_title}' has been accepted"
        return await self.create_notification(user_id, "forum_join_request_accepted", title, message)
    
    async def send_forum_join_request_declined_notification(self, user_id: int, forum_title: str):
        """Send notification when join request is declined"""
        title = "Request Declined"
        message = f"Your request to join '{forum_title}' has been declined"
        return await self.create_notification(user_id, "forum_join_request_declined", title, message)
    
    async def send_forum_deleted_notification(self, user_id: int, forum_title: str, creator_username: str):
        """Send notification when a forum is deleted"""
        title = "Forum Deleted"
        message = f"The forum '{forum_title}' created by {creator_username} has been deleted"
        return await self.create_notification(user_id, "forum_deleted", title, message)
