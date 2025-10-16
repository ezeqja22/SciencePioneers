import time
from typing import Any, Optional, Dict
from threading import Lock

class CacheService:
    """Simple in-memory cache service with TTL support"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            if time.time() > entry['expires_at']:
                # Expired, remove from cache
                del self._cache[key]
                return None
            
            return entry['value']
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Set value in cache with TTL"""
        with self._lock:
            self._cache[key] = {
                'value': value,
                'expires_at': time.time() + ttl_seconds
            }
    
    def delete(self, key: str) -> None:
        """Delete key from cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def clear(self) -> None:
        """Clear all cache"""
        with self._lock:
            self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            return {
                'total_keys': len(self._cache),
                'keys': list(self._cache.keys())
            }

# Global cache instance
cache_service = CacheService()
