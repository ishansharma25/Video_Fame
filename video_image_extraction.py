

import sys
import cloudinary
from cloudinary.uploader import upload
from cloudinary.utils import cloudinary_url
import cv2 as cv

from io import BytesIO

# Define a custom logging function
def console_log(*args):
    for arg in args:
        sys.stdout.write(str(arg))
        sys.stdout.write(' ')  # Add a space between arguments
    sys.stdout.write('\n')  # Add a newline after all arguments


# Configure Cloudinary
cloudinary.config(
  cloud_name= "dfad2oppz",
  api_key= "562573676845481",
  api_secret="0M_QJ_phoJotcnteN1lmBTd7NZA"
)

def process_video_to_image(video_path, start_time=None):
   

    try:
        video_url,options=cloudinary_url(video_path,resource_type="video")
        capture = cv.VideoCapture(video_url)
        frame_rate = capture.get(cv.CAP_PROP_FPS)
      

        if start_time is not None:
           
            start_frame = int(start_time * frame_rate)
            capture.set(cv.CAP_PROP_POS_FRAMES, start_frame)
        else:
           
            start_frame = 0


        ret, frame = capture.read()
        if  ret:
            #print("Frame retrieved successfully")
            _,image_data=cv.imencode('.jpg',frame)
            image_data_bytes = image_data.tobytes()
        capture.release()
        response = upload(BytesIO(image_data_bytes), folder="extracted_images")
        #print("Image uploaded to Cloudinary:", response['secure_url'])
        return response['secure_url']

    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python resize_and_convert_to_bw.py <image_url>")
        sys.exit(1)
    
    image_url = sys.argv[1]
    start_time = float(sys.argv[2])
    processed_image_url = process_video_to_image(image_url,start_time)
    if processed_image_url:
        print("Processed image URL:", processed_image_url)
    else:
        print("Failed to process image.")