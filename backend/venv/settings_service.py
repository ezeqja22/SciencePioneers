from sqlalchemy.orm import Session
from models import SystemSettings
from typing import Optional, Dict, Any

class SettingsService:
    """Service to manage and apply system settings"""
    
    def __init__(self, db: Session):
        self.db = db
        self._cache = {}
        self._load_settings()
    
    def _load_settings(self):
        """Load all settings into cache"""
        settings = self.db.query(SystemSettings).all()
        self._cache = {setting.key: setting.value for setting in settings}
    
    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a setting value"""
        return self._cache.get(key, default)
    
    def get_boolean(self, key: str, default: bool = False) -> bool:
        """Get a boolean setting"""
        value = self._cache.get(key, str(default))
        return value.lower() in ('true', '1', 'yes', 'on')
    
    def get_int(self, key: str, default: int = 0) -> int:
        """Get an integer setting"""
        try:
            return int(self._cache.get(key, str(default)))
        except (ValueError, TypeError):
            return default
    
    def get_site_settings(self) -> Dict[str, Any]:
        """Get site-related settings"""
        return {
            'name': self.get_setting('site_name', 'Science Pioneers'),
            'description': self.get_setting('site_description', 'A platform for science enthusiasts'),
            'logo': self.get_setting('site_logo', ''),
            'theme': self.get_setting('site_theme', 'light'),
            'language': self.get_setting('site_language', 'en'),
            'maintenance_mode': self.get_boolean('maintenance_mode', False),
            'maintenance_message': self.get_setting('maintenance_message', 'Site under maintenance'),
            'profile_visibility': self.get_setting('profile_visibility', 'public')
        }
    
    def get_feature_settings(self) -> Dict[str, bool]:
        """Get feature toggle settings"""
        return {
            'forums_enabled': self.get_boolean('forums_enabled', True),
            'comments_enabled': self.get_boolean('comments_enabled', True),
            'voting_enabled': self.get_boolean('voting_enabled', True),
            'bookmarks_enabled': self.get_boolean('bookmarks_enabled', True),
            'following_enabled': self.get_boolean('following_enabled', True),
            'notifications_enabled': self.get_boolean('notifications_enabled', True),
            'reports_enabled': self.get_boolean('reports_enabled', True),
            'registration_enabled': self.get_boolean('registration_enabled', True)
        }
    
    def get_security_settings(self) -> Dict[str, Any]:
        """Get security-related settings"""
        return {
            'password_min_length': self.get_int('password_min_length', 8),
            'password_require_special': self.get_boolean('password_require_special', True),
            'session_timeout_hours': self.get_int('session_timeout_hours', 24),
            'max_login_attempts': self.get_int('max_login_attempts', 5),
            'lockout_duration_minutes': self.get_int('lockout_duration_minutes', 30)
        }
    
    def get_content_settings(self) -> Dict[str, Any]:
        """Get content-related settings"""
        return {
            'max_problem_length': self.get_int('max_problem_length', 5000),
            'max_comment_length': self.get_int('max_comment_length', 1000),
            'max_forum_description_length': self.get_int('max_forum_description_length', 2000),
            'auto_moderate_content': self.get_boolean('auto_moderate_content', False),
            'require_approval_for_problems': self.get_boolean('require_approval_for_problems', False)
        }
    
    def is_maintenance_mode(self) -> bool:
        """Check if maintenance mode is enabled"""
        return self.get_boolean('maintenance_mode', False)
    
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a specific feature is enabled"""
        return self.get_boolean(f'{feature}_enabled', True)
    
    def refresh_cache(self):
        """Refresh the settings cache"""
        self._load_settings()

# Global settings service instance
_settings_service = None

def get_settings_service(db: Session) -> SettingsService:
    """Get the global settings service instance"""
    global _settings_service
    if _settings_service is None:
        _settings_service = SettingsService(db)
    return _settings_service

def refresh_settings_cache(db: Session):
    """Refresh the global settings cache"""
    global _settings_service
    if _settings_service is not None:
        _settings_service.refresh_cache()
