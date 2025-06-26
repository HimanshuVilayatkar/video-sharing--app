import asyncHandler from  "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const generateAccessAndRefreshToken=async(userId)=>{
   try {
      const user=User.findById(userId)

   const accessToken=user.generateAccessToken()
   const refreshToken=user.generateRefreshToken()
   user.refreshToken=refreshToken

   await user.save({validateBeforeSave:false})

   return {accessToken,refreshToken}
   } catch (error) {

      throw new ApiError(500,"sommething went wrong while generating access and refresh  token")
      
   }
}


const registerUser=asyncHandler(async(req,res)=>{
   //get users detail to register
   //validation -not empty
   //check if the user already exists through username and email
   //check for images ,check for avatar
   //upload them to cloudninary,avatar
   //create user object-create object in db
   //remove password and refresh token field from response
   //check for user cretion
   //return res
    
   const {fullName,email,username,password}=req.body
   // console.log(req.body)

   if(
    [fullName,email,username,password].some((fields)=>fields?.trim()=== "")
   ){
    throw new ApiError(400,"All fields are requried")
   }

   const existedUser=await User.findOne({
    $or:[{ username },{ email }]
   })

   if(existedUser){
    throw new ApiError(409,"User with email or username already existed ")
   }

   const avatarLoacalPath=req.files?.avatar[0]?.path;
   // const coverImageLoacalPath=req.files?.coverImage[0]?.path;

   let coverImageLoacalPath;
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
      coverImageLoacalPath=req.files.coverImage[0].path

   }

   // console.log(avatarLoacalPath)

   if(!avatarLoacalPath){
    throw new ApiError(400,"Avatar is requrired ")
   }

   const avatar = await uploadOnCloudinary(avatarLoacalPath)
   const coverImage= await uploadOnCloudinary(coverImageLoacalPath)
   // console.log(avatar);
   

   if(!avatar){
    throw new ApiError(400,"Avatar is requrired ")
   }

   const user= await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })

   const createdUser= await User.findById(user._id).select("-password -refreshToken")
   if(!createdUser){
    throw new ApiError(500,"SomeThing went wrong while registering user")

   }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"User Registred Successfully")
   )
})

const loginUser=asyncHandler(async(req,res)=>{
   //get email and password from user
   //validate if the user is registerd 
   //generate ascess and refresh token 
   //response successfully loggedin
   const {username,email,password}=req.body

   if(!username||!email){
      throw new ApiError(400,"username or email is required")
   }

   const user = await User.findOne({
      $or:[{username},{email}]
   }
   )

   if(!user){

      throw new ApiError(404,"User does notr exist")
   }

   const isPasswordValid=await user.isPasswordCorrect(password)
   if(!isPasswordValid){
      throw new ApiError(401,"Invalid Users Credentials")
   }
   const{accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

   const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
  // this is use to make the cookies not nonModifiable on frontend it can oly be modified by server
   const options={
      httpOnly:true,
      secure:true
   }
   return res.status(200)
   .cookie("accessToken",accessToken)
   .cookie("refreshToken",refreshToken)
   .json(
      new ApiResponse(
         200,
         {user:loggedInUser,accessToken,refreshToken},
         "User Logged In Successfully"
      )
   )
})

const logoutUser=asyncHandler(async(req,res)=>{

   await User.findByIdAndUpdate(req.user._id,{
      $set:{refreshToken:undefined}
   },{new:true})

   const options={
      httpOnly:true,
      secure:true
   }

   return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(
      new ApiResponse(200,{},"User Logged Out Successfully")
   )

})
export{registerUser,loginUser,logoutUser}