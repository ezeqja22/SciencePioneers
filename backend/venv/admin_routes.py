from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, desc, or_, and_
from database import get_db
from models import User, Forum, Problem, Comment, AdminAction, EmailCampaign, SiteReport, SystemSettings, UserModerationHistory, ForumMembership, ForumMessage, ForumReply
from admin_dependencies import require_admin, require_moderator, require_admin_or_moderator
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import time
# Removed notification cleanup service
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

router = APIRouter(prefix="/admin", tags=["admin"])

# Pydantic models for requests/responses
class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_banned: Optional[bool] = None
    ban_reason: Optional[str] = None

class EmailCampaignCreate(BaseModel):
    subject: str
    content: str
    target_audience: str
    target_user_ids: Optional[List[int]] = None

class SystemSettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None

# Dashboard endpoints
@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    
    # User statistics
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    banned_users = db.query(User).filter(User.is_banned == True).count()
    new_users_today = db.query(User).filter(
        User.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    
    # Forum statistics
    total_forums = db.query(Forum).count()
    private_forums = db.query(Forum).filter(Forum.is_private == True).count()
    public_forums = total_forums - private_forums
    
    # Problem statistics
    total_problems = db.query(Problem).count()
    problems_today = db.query(Problem).filter(
        Problem.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    
    # Recent activity
    recent_users = db.query(User).order_by(desc(User.created_at)).limit(5).all()
    recent_forums = db.query(Forum).order_by(desc(Forum.created_at)).limit(5).all()
    
    # Pending reports
    pending_reports = db.query(SiteReport).filter(SiteReport.status == "pending").count()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "banned": banned_users,
            "new_today": new_users_today
        },
        "forums": {
            "total": total_forums,
            "public": public_forums,
            "private": private_forums
        },
        "problems": {
            "total": total_problems,
            "new_today": problems_today
        },
        "reports": {
            "pending": pending_reports
        },
        "recent_users": [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at,
                "is_active": user.is_active
            } for user in recent_users
        ],
        "recent_forums": [
            {
                "id": forum.id,
                "title": forum.title,
                "creator": forum.creator.username,
                "is_private": forum.is_private,
                "created_at": forum.created_at
            } for forum in recent_forums
        ]
    }

# User management endpoints
@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get paginated list of users with filters"""
    
    query = db.query(User)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if status == "active":
        from sqlalchemy import or_
        query = query.filter(User.is_active == True, or_(User.is_banned == False, User.is_banned.is_(None)))
    elif status == "banned":
        query = query.filter(User.is_banned == True)
    elif status == "inactive":
        query = query.filter(User.is_active == False)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()
    
    return {
        "users": [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "is_banned": user.is_banned,
                "ban_reason": user.ban_reason,
                "created_at": user.created_at,
                "last_login": user.created_at  # You might want to add last_login field
            } for user in users
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@router.post("/forums/{forum_id}/approve")
async def approve_forum(
    forum_id: int,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Approve a forum"""
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    forum.is_approved = True
    db.commit()
    
    return {"message": "Forum approved successfully"}

@router.post("/forums/{forum_id}/reject")
async def reject_forum(
    forum_id: int,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Reject a forum"""
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    forum.is_approved = False
    db.commit()
    
    return {"message": "Forum rejected successfully"}

@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific user"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's forums
    user_forums = db.query(Forum).filter(Forum.creator_id == user_id).all()
    
    # Get user's problems
    user_problems = db.query(Problem).filter(Problem.author_id == user_id).all()
    
    # Get user's comments
    user_comments = db.query(Comment).filter(Comment.author_id == user_id).all()
    
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "is_banned": user.is_banned,
            "ban_reason": user.ban_reason,
            "banned_at": user.banned_at,
            "created_at": user.created_at,
            "bio": user.bio,
            "is_verified": user.is_verified
        },
        "stats": {
            "forums_created": len(user_forums),
            "problems_submitted": len(user_problems),
            "comments_made": len(user_comments)
        },
        "forums": [
            {
                "id": forum.id,
                "title": forum.title,
                "is_private": forum.is_private,
                "created_at": forum.created_at
            } for forum in user_forums
        ]
    }

@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update user information (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admins from modifying other admins
    if user.role == 'admin' and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot modify other admin accounts")
    
    # Update fields
    if user_update.role is not None:
        user.role = user_update.role
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    if user_update.is_banned is not None:
        user.is_banned = user_update.is_banned
        if user_update.is_banned:
            user.banned_at = datetime.utcnow()
        else:
            user.banned_at = None
            user.ban_reason = None
    
    if user_update.ban_reason is not None:
        user.ban_reason = user_update.ban_reason
    
    # Log admin action
    admin_action = AdminAction(
        admin_id=current_user.id,
        action_type="update_user",
        target_id=user_id,
        target_type="user",
        details=f"Updated user {user.username}: {user_update.dict()}"
    )
    db.add(admin_action)
    
    db.commit()
    
    return {"message": "User updated successfully"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admins from deleting other admins
    if user.role == 'admin':
        raise HTTPException(status_code=403, detail="Cannot delete admin accounts")
    
    # Prevent self-deletion
    if current_user.id == user_id:
        raise HTTPException(status_code=403, detail="Cannot delete your own account")
    
    # Log admin action
    admin_action = AdminAction(
        admin_id=current_user.id,
        action_type="delete_user",
        target_id=user_id,
        target_type="user",
        details=f"Deleted user {user.username}"
    )
    db.add(admin_action)
    
    # Hard delete - actually remove the user from database
    db.delete(user)
    
    db.commit()
    
    return {"message": "User deleted successfully"}

# Forum management endpoints
@router.get("/forums")
async def get_forums(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    privacy: Optional[str] = None,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get paginated list of forums with filters"""
    
    query = db.query(Forum)
    
    # Apply filters
    if search:
        query = query.filter(Forum.title.ilike(f"%{search}%"))
    
    if privacy == "private":
        query = query.filter(Forum.is_private == True)
    elif privacy == "public":
        query = query.filter(Forum.is_private == False)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    forums = query.order_by(desc(Forum.created_at)).offset(offset).limit(limit).all()
    
    return {
        "forums": [
            {
                "id": forum.id,
                "title": forum.title,
                "description": forum.description,
                "creator": forum.creator.username,
                "is_private": forum.is_private,
                "max_members": forum.max_members,
                "created_at": forum.created_at,
                "last_activity": forum.last_activity
            } for forum in forums
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@router.delete("/forums/{forum_id}")
async def delete_forum(
    forum_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a forum (admin only)"""
    
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    try:
        # Log admin action
        admin_action = AdminAction(
            admin_id=current_user.id,
            action_type="delete_forum",
            target_id=forum_id,
            target_type="forum",
            details=f"Deleted forum: {forum.title}"
        )
        db.add(admin_action)
        
        # Delete related records first to avoid foreign key constraints
        from models import ForumMembership, ForumMessage, ForumInvitation, ForumJoinRequest, UserOnlineStatus, ForumReply
        
        # Delete forum-related records
        db.query(ForumReply).filter(ForumReply.forum_id == forum_id).delete()
        db.query(ForumMessage).filter(ForumMessage.forum_id == forum_id).delete()
        db.query(ForumMembership).filter(ForumMembership.forum_id == forum_id).delete()
        db.query(ForumInvitation).filter(ForumInvitation.forum_id == forum_id).delete()
        db.query(ForumJoinRequest).filter(ForumJoinRequest.forum_id == forum_id).delete()
        db.query(UserOnlineStatus).filter(UserOnlineStatus.forum_id == forum_id).delete()
        
        # Update problems to remove forum association
        db.query(Problem).filter(Problem.forum_id == forum_id).update({"forum_id": None})
        
        # Now delete the forum
        db.delete(forum)
        db.commit()
        
        return {"message": "Forum deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete forum: {str(e)}")

# Reports management
@router.get("/reports")
async def get_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get paginated list of reports"""
    
    query = db.query(SiteReport)
    
    if status:
        query = query.filter(SiteReport.status == status)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    reports = query.order_by(desc(SiteReport.created_at)).offset(offset).limit(limit).all()
    
    return {
        "reports": [
            {
                "id": report.id,
                "report_type": report.report_type,
                "target_id": report.target_id,
                "reason": report.reason,
                "description": report.description,
                "status": report.status,
                "reporter": report.reporter.username,
                "reviewer": report.reviewer.username if report.reviewer else None,
                "created_at": report.created_at,
                "reviewed_at": report.reviewed_at
            } for report in reports
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@router.put("/reports/{report_id}/resolve")
async def resolve_report(
    report_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Resolve a report"""
    
    try:
        body = await request.json()
        resolution = body.get("resolution")
        
        if not resolution:
            raise HTTPException(status_code=400, detail="Resolution is required")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    report = db.query(SiteReport).filter(SiteReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = "resolved"
    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.utcnow()
    report.resolution = resolution
    
    db.commit()
    
    return {"message": "Report resolved successfully"}

@router.put("/reports/{report_id}/dismiss")
async def dismiss_report(
    report_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Dismiss a report"""
    
    try:
        body = await request.json()
        reason = body.get("reason")
        
        if not reason:
            raise HTTPException(status_code=400, detail="Dismissal reason is required")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    report = db.query(SiteReport).filter(SiteReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = "dismissed"
    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.utcnow()
    report.resolution = f"Dismissed: {reason}"
    
    db.commit()
    
    return {"message": "Report dismissed successfully"}

@router.put("/reports/{report_id}/assign")
async def assign_report(
    report_id: int,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Assign a report to the current user"""
    
    report = db.query(SiteReport).filter(SiteReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.assigned_to:
        raise HTTPException(status_code=400, detail="Report is already assigned")
    
    report.assigned_to = current_user.id
    report.status = "under_review"
    report.investigation_notes = f"Assigned to {current_user.username} on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
    
    db.commit()
    
    return {"message": "Report assigned successfully"}

@router.put("/reports/{report_id}/investigation-notes")
async def update_investigation_notes(
    report_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Update investigation notes for a report"""
    
    try:
        body = await request.json()
        notes = body.get("notes", "")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    report = db.query(SiteReport).filter(SiteReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update notes for reports assigned to you")
    
    report.investigation_notes = notes
    db.commit()
    
    return {"message": "Investigation notes updated successfully"}

@router.post("/reports/{report_id}/send-email")
async def send_report_email(
    report_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Send email to reporter about report resolution"""
    
    try:
        body = await request.json()
        email_content = body.get("email_content")
        
        if not email_content:
            raise HTTPException(status_code=400, detail="Email content is required")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    report = db.query(SiteReport).filter(SiteReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You can only send emails for reports assigned to you")
    
    if report.status != "resolved":
        raise HTTPException(status_code=400, detail="Can only send emails for resolved reports")
    
    # Import email service
    from email_service import email_service
    
    # Send the actual email
    
    # Send the actual email
    email_sent = await email_service.send_notification_email(
        to_email=report.reporter.email,
        subject="🔬 Science Pioneers - Report Resolution",
        body=email_content
    )
    
    if email_sent:
        report.email_sent = True
        report.email_content = email_content
        report.email_sent_at = datetime.utcnow()
        db.commit()
        return {"message": "Email sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")

@router.get("/reports/{report_id}")
async def get_report_details(
    report_id: int,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific report"""
    
    report = db.query(SiteReport).options(
        selectinload(SiteReport.reporter),
        selectinload(SiteReport.assignee),
        selectinload(SiteReport.reviewer)
    ).filter(SiteReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Get target user information
    target_user = None
    if report.target_id:
        target_user_obj = db.query(User).filter(User.id == report.target_id).first()
        if target_user_obj:
            target_user = {
                "id": target_user_obj.id,
                "username": target_user_obj.username,
                "email": target_user_obj.email,
                "is_banned": target_user_obj.is_banned,
                "is_active": target_user_obj.is_active
            }
        else:
            # Create a placeholder for deleted/missing user
            target_user = {
                "id": report.target_id,
                "username": f"__deleted_user_{report.target_id}",
                "email": "deleted@example.com",
                "is_banned": False,
                "is_active": False
            }
    
    response_data = {
        "id": report.id,
        "report_type": report.report_type,
        "target_id": report.target_id,
        "reason": report.reason,
        "description": report.description,
        "status": report.status,
        "assigned_to": report.assignee.username if report.assignee else None,
        "investigation_notes": report.investigation_notes,
        "resolution": report.resolution,
        "email_sent": report.email_sent,
        "email_content": report.email_content,
        "email_sent_at": report.email_sent_at.isoformat() if report.email_sent_at else None,
        "created_at": report.created_at.isoformat(),
        "reviewed_at": report.reviewed_at.isoformat() if report.reviewed_at else None,
        "reporter": {
            "id": report.reporter.id,
            "username": report.reporter.username,
            "email": report.reporter.email
        },
        "target_user": target_user
    }
    
    return response_data

# User moderation endpoints
@router.post("/users/{user_id}/warn")
async def warn_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Warn a user"""
    
    try:
        body = await request.json()
        reason = body.get("reason")
        report_id = body.get("report_id")
        
        if not reason:
            raise HTTPException(status_code=400, detail="Reason is required")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create moderation history entry
    history_entry = UserModerationHistory(
        user_id=user_id,
        moderator_id=current_user.id,
        action_type="warn",
        reason=reason,
        report_id=report_id
    )
    db.add(history_entry)
    db.commit()
    
    return {"message": "User warned successfully"}

@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Ban a user (permanent or temporary)"""
    
    try:
        body = await request.json()
        reason = body.get("reason")
        duration = body.get("duration")  # in days, None for permanent
        report_id = body.get("report_id")
        
        if not reason:
            raise HTTPException(status_code=400, detail="Reason is required")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user status
    user.is_banned = True
    user.banned_at = datetime.utcnow()
    user.ban_reason = reason
    
    # Create moderation history entry
    action_type = "time_ban" if duration else "ban"
    history_entry = UserModerationHistory(
        user_id=user_id,
        moderator_id=current_user.id,
        action_type=action_type,
        reason=reason,
        duration=duration,
        report_id=report_id
    )
    db.add(history_entry)
    db.commit()
    
    return {"message": "User banned successfully"}

@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Unban a user"""
    
    try:
        body = await request.json()
        reason = body.get("reason", "Ban lifted")
        report_id = body.get("report_id")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user status
    user.is_banned = False
    user.banned_at = None
    user.ban_reason = None
    
    # Create moderation history entry
    history_entry = UserModerationHistory(
        user_id=user_id,
        moderator_id=current_user.id,
        action_type="unban",
        reason=reason,
        report_id=report_id
    )
    db.add(history_entry)
    db.commit()
    
    return {"message": "User unbanned successfully"}

@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Deactivate a user account"""
    
    try:
        body = await request.json()
        reason = body.get("reason")
        report_id = body.get("report_id")
        
        if not reason:
            raise HTTPException(status_code=400, detail="Reason is required")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user status
    user.is_active = False
    
    # Create moderation history entry
    history_entry = UserModerationHistory(
        user_id=user_id,
        moderator_id=current_user.id,
        action_type="deactivate",
        reason=reason,
        report_id=report_id
    )
    db.add(history_entry)
    db.commit()
    
    return {"message": "User deactivated successfully"}

@router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Activate a user account"""
    
    try:
        body = await request.json()
        reason = body.get("reason", "Account reactivated")
        report_id = body.get("report_id")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user status
    user.is_active = True
    
    # Create moderation history entry
    history_entry = UserModerationHistory(
        user_id=user_id,
        moderator_id=current_user.id,
        action_type="activate",
        reason=reason,
        report_id=report_id
    )
    db.add(history_entry)
    db.commit()
    
    return {"message": "User activated successfully"}

@router.get("/users/{user_id}/moderation-history")
async def get_user_moderation_history(
    user_id: int,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get moderation history for a user"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    history = db.query(UserModerationHistory).options(
        selectinload(UserModerationHistory.moderator),
        selectinload(UserModerationHistory.report)
    ).filter(UserModerationHistory.user_id == user_id).order_by(desc(UserModerationHistory.created_at)).all()
    
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_banned": user.is_banned,
            "is_active": user.is_active
        },
        "history": [
            {
                "id": entry.id,
                "action_type": entry.action_type,
                "reason": entry.reason,
                "duration": entry.duration,
                "moderator": entry.moderator.username,
                "report_id": entry.report_id,
                "created_at": entry.created_at.isoformat()
            } for entry in history
        ]
    }

# Email campaigns
@router.post("/email/campaigns")
async def create_email_campaign(
    campaign: EmailCampaignCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new email campaign"""
    
    # Calculate recipient count based on target audience
    recipient_count = 0
    
    if campaign.target_audience == "all":
        recipient_count = db.query(User).filter(User.is_active == True).count()
    elif campaign.target_audience == "marketing_opt_in":
        recipient_count = db.query(User).filter(
            User.is_active == True,
            User.marketing_emails == True
        ).count()
    elif campaign.target_audience == "admins":
        recipient_count = db.query(User).filter(User.role == "admin", User.is_active == True).count()
    elif campaign.target_audience == "moderators":
        recipient_count = db.query(User).filter(User.role == "moderator", User.is_active == True).count()
    elif campaign.target_audience == "users":
        recipient_count = db.query(User).filter(User.role == "user", User.is_active == True).count()
    elif campaign.target_audience == "specific":
        if campaign.target_user_ids:
            recipient_count = db.query(User).filter(
                User.id.in_(campaign.target_user_ids),
                User.is_active == True
            ).count()
    
    email_campaign = EmailCampaign(
        subject=campaign.subject,
        content=campaign.content,
        target_audience=campaign.target_audience,
        target_user_ids=campaign.target_user_ids,
        created_by=current_user.id,
        recipient_count=recipient_count
    )
    
    db.add(email_campaign)
    db.commit()
    
    return {"message": "Email campaign created successfully", "campaign_id": email_campaign.id}

@router.get("/email/campaigns")
async def get_email_campaigns(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all email campaigns"""
    
    campaigns = db.query(EmailCampaign).order_by(desc(EmailCampaign.created_at)).all()
    
    return [
        {
            "id": campaign.id,
            "subject": campaign.subject,
            "target_audience": campaign.target_audience,
            "status": campaign.status,
            "recipient_count": campaign.recipient_count,
            "created_by": campaign.creator.username,
            "created_at": campaign.created_at,
            "sent_at": campaign.sent_at
        } for campaign in campaigns
    ]

@router.post("/email/campaigns/{campaign_id}/send")
async def send_email_campaign(
    campaign_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Send an email campaign"""
    
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Campaign has already been sent or is not in draft status")
    
    # Get target users based on audience
    target_users = []
    
    if campaign.target_audience == "all":
        target_users = db.query(User).filter(User.is_active == True).all()
    elif campaign.target_audience == "marketing_opt_in":
        target_users = db.query(User).filter(
            User.is_active == True,
            User.marketing_emails == True
        ).all()
    elif campaign.target_audience == "admins":
        target_users = db.query(User).filter(User.role == "admin", User.is_active == True).all()
    elif campaign.target_audience == "moderators":
        target_users = db.query(User).filter(User.role == "moderator", User.is_active == True).all()
    elif campaign.target_audience == "users":
        target_users = db.query(User).filter(User.role == "user", User.is_active == True).all()
    elif campaign.target_audience == "specific":
        if campaign.target_user_ids:
            target_users = db.query(User).filter(
                User.id.in_(campaign.target_user_ids),
                User.is_active == True
            ).all()
    
    if not target_users:
        raise HTTPException(status_code=400, detail="No target users found for this campaign")
    
    # Import email service
    from email_service import email_service
    
    # Send emails to all target users
    successful_sends = 0
    failed_sends = 0
    
    for user in target_users:
        try:
            # Send email using the email service
            email_sent = await email_service.send_notification_email(
                to_email=user.email,
                subject=campaign.subject,
                body=campaign.content
            )
            
            if email_sent:
                successful_sends += 1
            else:
                failed_sends += 1
                
        except Exception as e:
            failed_sends += 1
    
    # Update campaign status
    if successful_sends > 0:
        campaign.status = "sent"
        campaign.sent_at = datetime.utcnow()
        campaign.recipient_count = successful_sends
        db.commit()
        
        return {
            "message": f"Campaign sent successfully to {successful_sends} users",
            "successful_sends": successful_sends,
            "failed_sends": failed_sends
        }
    else:
        campaign.status = "failed"
        db.commit()
        
        raise HTTPException(status_code=500, detail="Failed to send campaign to any users")

@router.get("/email/campaigns/{campaign_id}")
async def get_campaign_details(
    campaign_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific campaign"""
    
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {
        "id": campaign.id,
        "subject": campaign.subject,
        "content": campaign.content,
        "target_audience": campaign.target_audience,
        "target_user_ids": campaign.target_user_ids,
        "status": campaign.status,
        "recipient_count": campaign.recipient_count,
        "created_by": campaign.creator.username,
        "created_at": campaign.created_at.isoformat(),
        "sent_at": campaign.sent_at.isoformat() if campaign.sent_at else None,
        "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None
    }

@router.delete("/email/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete an email campaign"""
    
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status == "sent":
        raise HTTPException(status_code=400, detail="Cannot delete a campaign that has already been sent")
    
    db.delete(campaign)
    db.commit()
    
    return {"message": "Campaign deleted successfully"}

# Analytics
@router.get("/analytics")
async def get_analytics(
    range: str = "7d",
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get analytics data for the admin dashboard"""
    
    # Calculate date range
    now = datetime.utcnow()
    if range == "1d":
        start_date = now - timedelta(days=1)
    elif range == "7d":
        start_date = now - timedelta(days=7)
    elif range == "30d":
        start_date = now - timedelta(days=30)
    elif range == "90d":
        start_date = now - timedelta(days=90)
    elif range == "1y":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=7)
    
    # User analytics
    new_users = db.query(User).filter(User.created_at >= start_date).count()
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    
    # Calculate user activity rate (users with recent activity)
    recent_activity_users = db.query(User).join(Comment).filter(
        Comment.created_at >= start_date
    ).distinct().count()
    
    user_activity_rate = round((recent_activity_users / total_users * 100), 1) if total_users > 0 else 0
    
    # Forum analytics
    new_forums = db.query(Forum).filter(Forum.created_at >= start_date).count()
    
    # Problem analytics
    new_problems = db.query(Problem).filter(Problem.created_at >= start_date).count()
    total_comments = db.query(Comment).count()
    comments_in_period = db.query(Comment).filter(Comment.created_at >= start_date).count()
    
    # Calculate comments per day
    days = (now - start_date).days or 1
    comments_per_day = round(comments_in_period / days, 1)
    
    # Reports analytics
    total_reports = db.query(SiteReport).count()
    resolved_reports = db.query(SiteReport).filter(SiteReport.status == "resolved").count()
    
    # Top users by activity (problems + comments) in the selected time period
    # Use subqueries to get accurate counts
    problems_subquery = db.query(
        Problem.author_id,
        func.count(Problem.id).label('problems_count')
    ).filter(Problem.created_at >= start_date).group_by(Problem.author_id).subquery()
    
    comments_subquery = db.query(
        Comment.author_id,
        func.count(Comment.id).label('comments_count')
    ).filter(Comment.created_at >= start_date).group_by(Comment.author_id).subquery()
    
    top_users = db.query(
        User.id,
        User.username,
        func.coalesce(problems_subquery.c.problems_count, 0).label('problems_count'),
        func.coalesce(comments_subquery.c.comments_count, 0).label('comments_count')
    ).outerjoin(problems_subquery, User.id == problems_subquery.c.author_id
    ).outerjoin(comments_subquery, User.id == comments_subquery.c.author_id
    ).filter(
        or_(
            problems_subquery.c.problems_count > 0,
            comments_subquery.c.comments_count > 0
        )
    ).order_by(
        desc(func.coalesce(problems_subquery.c.problems_count, 0) + func.coalesce(comments_subquery.c.comments_count, 0))
    ).limit(10).all()
    
    # Format top users
    top_users_formatted = []
    for user in top_users:
        activity_score = user.problems_count + user.comments_count
        top_users_formatted.append({
            "id": user.id,
            "username": user.username,
            "problems_count": user.problems_count,
            "comments_count": user.comments_count,
            "activity_score": activity_score
        })
    
    # Popular forums (by recent activity in the selected time period)
    # Use subqueries for accurate counts
    forum_messages_subquery = db.query(
        ForumMessage.forum_id,
        func.count(ForumMessage.id).label('message_count')
    ).filter(ForumMessage.created_at >= start_date).group_by(ForumMessage.forum_id).subquery()
    
    forum_replies_subquery = db.query(
        ForumReply.forum_id,
        func.count(ForumReply.id).label('reply_count')
    ).filter(ForumReply.created_at >= start_date).group_by(ForumReply.forum_id).subquery()
    
    forum_members_subquery = db.query(
        ForumMembership.forum_id,
        func.count(ForumMembership.id).label('member_count')
    ).group_by(ForumMembership.forum_id).subquery()
    
    popular_forums = db.query(
        Forum.id,
        Forum.title,
        Forum.description,
        Forum.created_at,
        func.coalesce(forum_members_subquery.c.member_count, 0).label('member_count'),
        func.coalesce(forum_messages_subquery.c.message_count, 0).label('message_count'),
        func.coalesce(forum_replies_subquery.c.reply_count, 0).label('reply_count')
    ).outerjoin(forum_members_subquery, Forum.id == forum_members_subquery.c.forum_id
    ).outerjoin(forum_messages_subquery, Forum.id == forum_messages_subquery.c.forum_id
    ).outerjoin(forum_replies_subquery, Forum.id == forum_replies_subquery.c.forum_id
    ).order_by(desc(
        func.coalesce(forum_messages_subquery.c.message_count, 0) + 
        func.coalesce(forum_replies_subquery.c.reply_count, 0)
    )).limit(10).all()
    
    # Format popular forums
    popular_forums_formatted = []
    for forum in popular_forums:
        # Calculate activity score based on recent activity (messages + replies in time period)
        recent_activity = forum.message_count + forum.reply_count
        
        # Determine activity level based on recent activity and member count
        if recent_activity > 10 or forum.member_count > 15:
            activity_level = "High"
        elif recent_activity > 3 or forum.member_count > 8:
            activity_level = "Medium"
        else:
            activity_level = "Low"
        
        popular_forums_formatted.append({
            "id": forum.id,
            "name": forum.title,
            "description": forum.description,
            "member_count": forum.member_count,
            "message_count": forum.message_count,
            "reply_count": forum.reply_count,
            "recent_activity": recent_activity,
            "created_at": forum.created_at.isoformat() if forum.created_at else None,
            "activity_level": activity_level
        })
    
    # System health metrics
    # Database response time
    db_start = time.time()
    db.query(User).count()  # Simple query to test response time
    db_response_time = round((time.time() - db_start) * 1000, 2)
    
    # Storage usage
    if PSUTIL_AVAILABLE:
        try:
            disk_usage = psutil.disk_usage('/')
            storage_usage = f"{round(disk_usage.used / (1024**3), 1)}GB / {round(disk_usage.total / (1024**3), 1)}GB"
        except:
            storage_usage = "N/A"
    else:
        storage_usage = "N/A (psutil not installed)"
    
    # Uptime (mock)
    uptime = "99.9%"
    
    return {
        "new_users": new_users,
        "active_users": active_users,
        "user_activity_rate": user_activity_rate,
        "new_forums": new_forums,
        "new_problems": new_problems,
        "total_comments": total_comments,
        "comments_per_day": comments_per_day,
        "total_reports": total_reports,
        "resolved_reports": resolved_reports,
        "top_users": top_users_formatted,
        "popular_forums": popular_forums_formatted,
        "db_response_time": db_response_time,
        "storage_usage": storage_usage,
        "uptime": uptime
    }

# ==================== SETTINGS ENDPOINTS ====================

@router.get("/settings")
async def get_settings(
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get all system settings"""
    settings = db.query(SystemSettings).all()
    
    # Organize settings by category
    settings_dict = {}
    for setting in settings:
        category = setting.key.split('_')[0] if '_' in setting.key else 'general'
        if category not in settings_dict:
            settings_dict[category] = {}
        settings_dict[category][setting.key] = {
            "value": setting.value,
            "description": setting.description,
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
            "updated_by": setting.updater.username if setting.updater else None
        }
    
    return settings_dict

@router.post("/settings")
async def update_settings(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update system settings"""
    try:
        body = await request.json()
        settings_data = body.get("settings", {})
        
        updated_settings = []
        
        for key, value in settings_data.items():
            # Get or create setting
            setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
            
            if setting:
                setting.value = str(value) if value is not None else None
                setting.updated_by = current_user.id
                setting.updated_at = datetime.utcnow()
            else:
                setting = SystemSettings(
                    key=key,
                    value=str(value) if value is not None else None,
                    updated_by=current_user.id
                )
                db.add(setting)
            
            updated_settings.append({
                "key": key,
                "value": setting.value,
                "updated_at": setting.updated_at.isoformat() if setting.updated_at else None
            })
        
        db.commit()
        
        # Refresh settings cache
        from settings_service import refresh_settings_cache
        refresh_settings_cache(db)
        
        return {
            "message": "Settings updated successfully",
            "updated_settings": updated_settings
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@router.get("/settings/{category}")
async def get_settings_by_category(
    category: str,
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get settings by category"""
    settings = db.query(SystemSettings).filter(
        SystemSettings.key.like(f"{category}_%")
    ).all()
    
    return {
        setting.key: {
            "value": setting.value,
            "description": setting.description,
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
            "updated_by": setting.updater.username if setting.updater else None
        }
        for setting in settings
    }

@router.post("/settings/initialize")
async def initialize_default_settings(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Initialize default system settings"""
    
    default_settings = {
        # Site Settings
        "site_name": "Science Pioneers",
        "site_description": "A platform for science enthusiasts to share problems and collaborate",
        "site_logo": "",
        "site_favicon": "",
        "site_theme": "light",
        "site_language": "en",
        
        # Email Settings
        "smtp_server": "smtp.gmail.com",
        "smtp_port": "587",
        "smtp_username": "",
        "smtp_password": "",
        "smtp_use_tls": "true",
        "email_from_name": "Science Pioneers",
        "email_from_address": "",
        
        # Registration Settings
        "registration_enabled": "true",
        "email_verification_required": "true",
        "auto_approve_users": "false",
        "max_users": "10000",
        
        # Security Settings
        "password_min_length": "8",
        "password_require_special": "true",
        "session_timeout_hours": "24",
        "max_login_attempts": "5",
        "lockout_duration_minutes": "30",
        
        # Content Settings
        "max_problem_length": "5000",
        "max_comment_length": "1000",
        "max_forum_description_length": "2000",
        "auto_moderate_content": "false",
        "require_approval_for_problems": "false",
        
        # Forum Settings
        "max_members_per_forum": "100",
        "forum_creation_requires_approval": "false",
        "default_forum_visibility": "public",
        
        # Notification Settings
        "email_notifications_enabled": "true",
        # Removed push notifications
        "notification_retention_days": "30",
        
        # Analytics Settings
        "analytics_enabled": "true",
        "track_user_activity": "true",
        "data_retention_days": "365",
        "export_data_enabled": "true",
        
        # Maintenance Settings
        "maintenance_mode": "false",
        "maintenance_message": "We're currently performing maintenance. Please check back later.",
        "backup_frequency_hours": "24",
        "auto_cleanup_enabled": "true",
        
        # Feature Toggles
        "forums_enabled": "true",
        "comments_enabled": "true",
        "voting_enabled": "true",
        "bookmarks_enabled": "true",
        "following_enabled": "true",
        "notifications_enabled": "true",
        "reports_enabled": "true",
        
        # Rate Limiting
        "max_problems_per_day": "10",
        "max_comments_per_day": "50",
        "max_forum_messages_per_day": "20",
        "api_rate_limit_per_minute": "100",
        
        # Privacy Settings
        "profile_visibility": "public",
        "show_online_status": "true",
        "allow_data_export": "true",
        "gdpr_compliance": "true",
        
        # Integration Settings
        "google_analytics_id": "",
        "facebook_app_id": "",
        "twitter_handle": "",
        "discord_webhook": "",
        
        # Advanced Settings
        "cache_enabled": "true",
        "cache_ttl_minutes": "60",
        "cdn_enabled": "false",
        "cdn_url": "",
        "ssl_required": "true",
        "cors_origins": "http://localhost:3000,https://yourdomain.com"
    }
    
    try:
        for key, value in default_settings.items():
            # Check if setting already exists
            existing = db.query(SystemSettings).filter(SystemSettings.key == key).first()
            if not existing:
                setting = SystemSettings(
                    key=key,
                    value=value,
                    description=f"Default setting for {key.replace('_', ' ').title()}",
                    updated_by=current_user.id
                )
                db.add(setting)
        
        db.commit()
        return {"message": "Default settings initialized successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to initialize settings: {str(e)}")

@router.post("/settings/reset")
async def reset_settings_to_default(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reset all settings to default values"""
    try:
        # Delete all existing settings
        db.query(SystemSettings).delete()
        db.commit()
        
        # Re-initialize with defaults
        return await initialize_default_settings(current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset settings: {str(e)}")

@router.get("/settings/export")
async def export_settings(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Export all settings as JSON"""
    settings = db.query(SystemSettings).all()
    
    export_data = {
        "exported_at": datetime.utcnow().isoformat(),
        "exported_by": current_user.username,
        "settings": {}
    }
    
    for setting in settings:
        export_data["settings"][setting.key] = {
            "value": setting.value,
            "description": setting.description
        }
    
    return export_data

@router.post("/settings/import")
async def import_settings(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Import settings from JSON"""
    try:
        body = await request.json()
        settings_data = body.get("settings", {})
        
        imported_count = 0
        
        for key, data in settings_data.items():
            setting = SystemSettings(
                key=key,
                value=data.get("value"),
                description=data.get("description"),
                updated_by=current_user.id
            )
            db.add(setting)
            imported_count += 1
        
        db.commit()
        
        return {
            "message": f"Successfully imported {imported_count} settings",
            "imported_count": imported_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import settings: {str(e)}")

@router.get("/settings/backup")
async def backup_settings(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a backup of current settings"""
    settings = db.query(SystemSettings).all()
    
    backup_data = {
        "backup_created_at": datetime.utcnow().isoformat(),
        "created_by": current_user.username,
        "settings_count": len(settings),
        "settings": {}
    }
    
    for setting in settings:
        backup_data["settings"][setting.key] = {
            "value": setting.value,
            "description": setting.description,
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
            "updated_by": setting.updater.username if setting.updater else None
        }
    
    return backup_data

@router.get("/settings/site-info", include_in_schema=True)
async def get_site_info(
    db: Session = Depends(get_db)
):
    """Get public site information (no auth required)"""
    try:
        from settings_service import get_settings_service
        settings_service = get_settings_service(db)
        site_settings = settings_service.get_site_settings()
        
        result = {
            "site_name": site_settings.get('name', 'Science Pioneers'),
            "site_description": site_settings.get('description', 'A platform for science enthusiasts'),
            "site_logo": site_settings.get('logo', ''),
            "site_favicon": site_settings.get('favicon', ''),
            "site_theme": site_settings.get('theme', 'light'),
            "maintenance_mode": site_settings.get('maintenance_mode', False),
            "maintenance_message": site_settings.get('maintenance_message', 'Site under maintenance')
        }
        
        return result
    except Exception as e:
        # Return defaults if settings service fails
        return {
            "site_name": "Science Pioneers",
            "site_description": "A platform for science enthusiasts",
            "site_logo": "",
            "site_favicon": "",
            "site_theme": "light",
            "maintenance_mode": False,
            "maintenance_message": "Site under maintenance"
        }

@router.get("/settings/test")
async def test_settings_application(
    current_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Test endpoint to verify settings are being applied"""
    
    try:
        # Get key settings
        settings = db.query(SystemSettings).filter(
            SystemSettings.key.in_([
                'site_name', 'site_description', 'maintenance_mode', 
                'forums_enabled', 'registration_enabled',
                'smtp_server', 'smtp_port', 'smtp_username', 'email_from_name'
            ])
        ).all()
        
        settings_dict = {setting.key: setting.value for setting in settings}
        
        # Test if settings are working
        test_results = {
            "settings_loaded": len(settings_dict) > 0,
            "site_name": settings_dict.get('site_name', 'Not Set'),
            "maintenance_mode": settings_dict.get('maintenance_mode') == 'true',
            "forums_enabled": settings_dict.get('forums_enabled') == 'true',
            "registration_enabled": settings_dict.get('registration_enabled') == 'true',
            "smtp_server": settings_dict.get('smtp_server', 'Not Set'),
            "smtp_port": settings_dict.get('smtp_port', 'Not Set'),
            "smtp_username": settings_dict.get('smtp_username', 'Not Set'),
            "email_from_name": settings_dict.get('email_from_name', 'Not Set'),
            "total_settings": len(settings_dict)
        }
        
        response = {
            "message": "Settings test completed",
            "results": test_results,
            "all_settings": settings_dict
        }
        
        return response
        
    except Exception as e:
        
        return {
            "message": f"Settings test failed: {str(e)}",
            "results": {
                "settings_loaded": False,
                "error": str(e)
            }
        }
@router.get("/actions")
async def get_admin_actions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get admin actions log"""
    
    query = db.query(AdminAction)
    total = query.count()
    
    offset = (page - 1) * limit
    actions = query.order_by(desc(AdminAction.created_at)).offset(offset).limit(limit).all()
    
    return {
        "actions": [
            {
                "id": action.id,
                "admin": action.admin.username,
                "action_type": action.action_type,
                "target_id": action.target_id,
                "target_type": action.target_type,
                "details": action.details,
                "created_at": action.created_at
            } for action in actions
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

