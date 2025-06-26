import { v2 as cloudinary } from "cloudinary";
import fs from "fs"

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});



const uploadOnCloudinary= async (localFilePath)=>{
   try {
     if(!localFilePath) return null

     //upload file on cloudinary
    //  console.log(localFilePath);
     
      const response=await cloudinary.uploader.upload(localFilePath,{
        resource_type:"auto"
     })
    //  console.log("hi",response)

     //file has been uploaded successfully
    //  console.log("file is uploaded on cloudinary",response.url);
     fs.unlinkSync(localFilePath)
     return response
     
    
   } catch (error) {
     console.error("Upload failed:", error);
    fs.unlinkSync(localFilePath)/// it will remove the locally saved temporary file as the upload opertion got failed
    return null
    
   }
}

export {uploadOnCloudinary}