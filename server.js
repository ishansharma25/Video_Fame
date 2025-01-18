const express = require('express');
const multer=require('multer');
const bodyParser=require('body-parser');
const nodemailer=require('nodemailer');
const cloudinary = require('cloudinary').v2;



var app = express();
const { PythonShell } = require('python-shell');

const storage=multer.memoryStorage();
const upload=multer({storage:storage})

// Middleware for parsing form data
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(bodyParser.json()); // Parse JSON bodies

const port=3000;

require('dotenv').config(); // Load .env variables
console.log('Loaded Environment Variables:', process.env);


console.log({
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET
});



// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Gmail Transporter Configuration
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER, // Load Gmail user from .env
        pass: process.env.GMAIL_PASSWORD // Load Gmail password from .env
    }
});

async function sendMail(to,text,url)
{
    try
    {
        const mailOptions=
        {
            from:'ishan2507sharma@gmail.com',
            to:to,
            text:`${text}\n\nDownload the processed file from the following link:\n${url}`
        };
    
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully.');
    }
catch (error) {
    console.error('Error sending email:', error);
}
}




app.get('/video_to_frame',async(req,res)=>
{
 res.sendFile(__dirname+'/video_to_frame.html');

});
app.post('/video_to_frame', upload.single('video_input'),async(req,res)=>{
try {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    console.log("2");
    console.log(req.file);
    const { recipient} = req.body;
    const {number1} = req.body;
    console.log(recipient);
    const intValue = parseInt(number1);
    console.log("Received integer:", intValue);

    cloudinary.uploader.upload_stream({resource_type:'auto'},async (error,result)=>

{
    if(error)
    {
        console.error(error);
    return res.status(500).send('Error uploading image to Cloudinary.');
    }

    const url=result.url
    console.log(url)
    let result1;
    result1=await PythonShell.run('video_image_extraction.py', { args: [url, intValue.toString()] }, (err, results) => {
        if (err) {
            console.error('Error executing Python script:', err);
            return res.status(500).send('Error executing Python script.');
        }

        console.log('Python script executed successfully:', results);
        // Handle any further response or actions here
        res.status(200).send('Video frame extraction completed.');
    })
    const text = 'See attachment for processed file.';
    console.log(result1);
       
sendMail(recipient,text,result1);

}).end(req.file.buffer);
    }

catch (error) {
    console.error('Error processing file:', error);
    return res.status(500).send('Internal server error.');
}
});
app.listen({port},()=>
{  
    console.log(`server:${port} is on`);
});