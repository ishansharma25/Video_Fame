import sys
import cloudinary
from cloudinary.uploader import upload
from cloudinary.utils import cloudinary_url
import cv2 as cv
from io import BytesIO
from urllib.parse import unquote
import os
from dotenv import load_dotenv
# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

def process_video_to_image(video_url, start_time=None):
    try:
        # Decode URL if needed
        video_url = unquote(video_url)
        
        # Open video capture
        capture = cv.VideoCapture(video_url)
        
        if not capture.isOpened():
            raise Exception("Failed to open video stream")
            
        frame_rate = capture.get(cv.CAP_PROP_FPS)
        
        # Set frame position
        if start_time is not None:
            start_frame = int(float(start_time) * frame_rate)
            capture.set(cv.CAP_PROP_POS_FRAMES, start_frame)
        
        # Read frame
        ret, frame = capture.read()
        if not ret:
            raise Exception("Failed to read frame")
            
        # Convert frame to jpg
        _, image_data = cv.imencode('.jpg', frame)
        image_data_bytes = image_data.tobytes()
        
        # Release video capture
        capture.release()
        
        # Upload to Cloudinary
        upload_result = upload(
            BytesIO(image_data_bytes), 
            folder="extracted_images",
            resource_type="image"
        )
        
        return upload_result['secure_url']
        
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        return None
    finally:
        if 'capture' in locals():
            capture.release()

if __name__ == "__main__":
    try:
        # Validate arguments
        if len(sys.argv) != 3:
            raise Exception("Usage: python video_image_extraction.py <video_url> <start_time>")
            
        video_url = sys.argv[1]
        start_time = sys.argv[2]
        
        # Process video and get image URL
        processed_url = process_video_to_image(video_url, start_time)
        
        if processed_url:
            # Print only the URL without any prefix
            print(processed_url)
        else:
            raise Exception("Failed to process video")
            
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)