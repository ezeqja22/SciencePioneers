import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
from typing import Optional, Dict, Any
from fastapi import UploadFile
import uuid

class CloudinaryService:
    def __init__(self):
        # Configure Cloudinary with environment variables
        cloudinary.config(
            cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
            api_key=os.getenv('CLOUDINARY_API_KEY'),
            api_secret=os.getenv('CLOUDINARY_API_SECRET'),
            secure=True
        )
        
        # Base URL for image delivery
        self.base_url = f"https://res.cloudinary.com/{os.getenv('CLOUDINARY_CLOUD_NAME')}/image/upload"
    
    def upload_image(self, file: UploadFile, folder: str = "general", transformations: Dict[str, Any] = None) -> Optional[str]:
        """
        Upload an image to Cloudinary
        
        Args:
            file: FastAPI UploadFile object
            folder: Cloudinary folder to store the image
            transformations: Optional transformations to apply
            
        Returns:
            Cloudinary public URL or None if upload fails
        """
        try:
            # Generate unique filename
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            
            # Upload options
            upload_options = {
                "folder": folder,
                "public_id": unique_filename,
                "resource_type": "auto",
                "overwrite": True
            }
            
            # Add transformations if provided
            if transformations:
                upload_options.update(transformations)
            
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                file.file,
                **upload_options
            )
            
            print(f"DEBUG: Image uploaded to Cloudinary: {result['public_id']}")
            return result['secure_url']
            
        except Exception as e:
            print(f"ERROR: Cloudinary upload failed: {e}")
            return None
    
    def upload_profile_picture(self, file: UploadFile, user_id: int) -> Optional[str]:
        """
        Upload profile picture with specific transformations
        
        Args:
            file: FastAPI UploadFile object
            user_id: User ID for unique naming
            
        Returns:
            Cloudinary public URL or None if upload fails
        """
        transformations = {
            "width": 300,
            "height": 300,
            "crop": "fill",
            "gravity": "face",
            "quality": "auto",
            "format": "auto"
        }
        
        return self.upload_image(file, f"profile_pictures/user_{user_id}", transformations)
    
    def upload_problem_image(self, file: UploadFile, problem_id: int) -> Optional[str]:
        """
        Upload problem image with specific transformations
        
        Args:
            file: FastAPI UploadFile object
            problem_id: Problem ID for unique naming
            
        Returns:
            Cloudinary public URL or None if upload fails
        """
        transformations = {
            "width": 800,
            "height": 600,
            "crop": "limit",
            "quality": "auto",
            "format": "auto"
        }
        
        return self.upload_image(file, f"problem_images/problem_{problem_id}", transformations)
    
    def upload_forum_image(self, file: UploadFile, forum_id: int) -> Optional[str]:
        """
        Upload forum image with specific transformations
        
        Args:
            file: FastAPI UploadFile object
            forum_id: Forum ID for unique naming
            
        Returns:
            Cloudinary public URL or None if upload fails
        """
        transformations = {
            "width": 1000,
            "height": 800,
            "crop": "limit",
            "quality": "auto",
            "format": "auto"
        }
        
        return self.upload_image(file, f"forum_images/forum_{forum_id}", transformations)
    
    def delete_image(self, public_url: str) -> bool:
        """
        Delete an image from Cloudinary
        
        Args:
            public_url: Full Cloudinary URL of the image
            
        Returns:
            True if deletion successful, False otherwise
        """
        try:
            # Extract public_id from URL
            # URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
            parts = public_url.split('/')
            if len(parts) < 8:
                print(f"ERROR: Invalid Cloudinary URL format: {public_url}")
                return False
            
            # Get the part after 'upload/' and before the version
            upload_index = parts.index('upload')
            if upload_index + 1 >= len(parts):
                print(f"ERROR: Invalid Cloudinary URL format: {public_url}")
                return False
            
            # Extract public_id (everything after 'upload/' without version)
            public_id_parts = parts[upload_index + 2:]  # Skip 'upload' and version
            public_id = '/'.join(public_id_parts).split('.')[0]  # Remove file extension
            
            # Delete from Cloudinary
            result = cloudinary.uploader.destroy(public_id)
            
            if result.get('result') == 'ok':
                print(f"DEBUG: Image deleted from Cloudinary: {public_id}")
                return True
            else:
                print(f"ERROR: Failed to delete image from Cloudinary: {result}")
                return False
                
        except Exception as e:
            print(f"ERROR: Cloudinary deletion failed: {e}")
            return False
    
    def get_optimized_url(self, public_url: str, transformations: Dict[str, Any] = None) -> str:
        """
        Get optimized URL for an image with transformations
        
        Args:
            public_url: Full Cloudinary URL
            transformations: Optional transformations to apply
            
        Returns:
            Optimized Cloudinary URL
        """
        try:
            # Extract public_id from URL
            parts = public_url.split('/')
            upload_index = parts.index('upload')
            public_id_parts = parts[upload_index + 2:]
            public_id = '/'.join(public_id_parts).split('.')[0]
            
            # Generate optimized URL
            if transformations:
                # Apply transformations
                transform_str = ','.join([f"{k}_{v}" for k, v in transformations.items()])
                optimized_url = f"{self.base_url}/{transform_str}/{public_id}"
            else:
                # No transformations, return original URL
                optimized_url = public_url
            
            return optimized_url
            
        except Exception as e:
            print(f"ERROR: Failed to generate optimized URL: {e}")
            return public_url
    
    def is_configured(self) -> bool:
        """
        Check if Cloudinary is properly configured
        
        Returns:
            True if configured, False otherwise
        """
        return bool(
            os.getenv('CLOUDINARY_CLOUD_NAME') and
            os.getenv('CLOUDINARY_API_KEY') and
            os.getenv('CLOUDINARY_API_SECRET')
        )

# Create global instance
cloudinary_service = CloudinaryService()
