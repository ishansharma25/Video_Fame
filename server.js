const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const path = require('path');

var app = express();
const { PythonShell } = require('python-shell');

// Storage configuration for multer
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Set the views directory
app.set('views', __dirname);

const port = 3000;

require('dotenv').config();

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Nodemailer transporter
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
    }
});

async function sendMail(to, originalImageUrl, processedImageUrl) {
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: to,
            subject: 'Your Processed Images',
            html: `
                <h1>Your Processed Images</h1>
             
                <div style="margin-bottom: 20px;">
                    <h2>Processed Grayscale Image:</h2>
                    <img src="${processedImageUrl}" alt="Processed Image" style="max-width: 500px;">
                    <p>Direct download link for grayscale image: <a href="${processedImageUrl}">Click here</a></p>
                </div>
                <p>Note: The processed image has been converted to grayscale. If you're seeing it in color, please try downloading it using the link above.</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/video_to_frame');
});

app.get('/video_to_frame', (req, res) => {
    res.sendFile(path.join(__dirname, 'video_to_frame.html'));
});

app.post('/video_to_frame', upload.single('video_input'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const { recipient } = req.body;
        const { number1 } = req.body;
        const intValue = parseInt(number1);

        cloudinary.uploader.upload_stream({ resource_type: 'auto' }, async (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Error uploading image to Cloudinary.' });
            }

            const originalImageUrl = result.secure_url;
            console.log(`Original Image:${originalImageUrl}`)

            try {
                const options = {
                    args: [originalImageUrl, intValue.toString()],
                    pythonOptions: ['-u']  // Unbuffered output
                };

                const results = await PythonShell.run('video_image_extraction.py', options);
                
                // Get the last non-empty line as the URL
                const processedImageUrl = results
                    .filter(line => line.trim())
                    .pop();
                    console.log(`Processed Image:${processedImageUrl}`)
                if (!processedImageUrl) {
                    throw new Error('No processed image URL received from Python script');
                }

                const emailSent = await sendMail(recipient, originalImageUrl, processedImageUrl);
                
                res.status(200).json({ 
                    message: 'Video frame extraction completed.',
                    originalImageUrl: originalImageUrl,
                    processedImageUrl: processedImageUrl,
                    emailSent: emailSent
                });
            } catch (err) {
                console.error('Error executing Python script:', err);
                res.status(500).json({ error: 'Error executing Python script: ' + err.message });
            }
        }).end(req.file.buffer);
    } catch (error) {
        console.error('Error processing file:', error);
        return res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Error handling for 404
app.use((req, res) => {
    res.status(404).send('404: Page not found');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
