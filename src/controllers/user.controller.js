import asyncHandler from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async (userId) => {
   try {
      const user = await User.findById(userId)

      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()
      user.refreshToken = refreshToken

      await user.save({ validateBeforeSave: false })

      return { accessToken, refreshToken }
   } catch (error) {

      throw new ApiError(500, "sommething went wrong while generating access and refresh  token")

   }
}


const registerUser = asyncHandler(async (req, res) => {
   //get users detail to register
   //validation -not empty
   //check if the user already exists through username and email
   //check for images ,check for avatar
   //upload them to cloudninary,avatar
   //create user object-create object in db
   //remove password and refresh token field from response
   //check for user cretion
   //return res

   const { fullName, email, username, password } = req.body
   // console.log(req.body)

   if (
      [fullName, email, username, password].some((fields) => fields?.trim() === "")
   ) {
      throw new ApiError(400, "All fields are requried")
   }

   const existedUser = await User.findOne({
      $or: [{ username }, { email }]
   })

   if (existedUser) {
      throw new ApiError(409, "User with email or username already existed ")
   }

   const avatarLoacalPath = req.files?.avatar[0]?.path;
   // const coverImageLoacalPath=req.files?.coverImage[0]?.path;

   let coverImageLoacalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLoacalPath = req.files.coverImage[0].path

   }

   // console.log(avatarLoacalPath)

   if (!avatarLoacalPath) {
      throw new ApiError(400, "Avatar is requrired ")
   }

   const avatar = await uploadOnCloudinary(avatarLoacalPath)
   const coverImage = await uploadOnCloudinary(coverImageLoacalPath)
   // console.log(avatar);


   if (!avatar) {
      throw new ApiError(400, "Avatar is requrired ")
   }

   const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase()
   })

   const createdUser = await User.findById(user._id).select("-password -refreshToken")
   if (!createdUser) {
      throw new ApiError(500, "SomeThing went wrong while registering user")

   }

   return res.status(201).json(
      new ApiResponse(200, createdUser, "User Registred Successfully")
   )
})

const loginUser = asyncHandler(async (req, res) => {
   //get email and password from user
   //validate if the user is registerd 
   //generate ascess and refresh token 
   //response successfully loggedin
   const { username, email, password } = req.body

   if (!username && !email) {
      throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({
      $or: [{ username }, { email }]
   }
   )

   if (!user) {

      throw new ApiError(404, "User does notr exist")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)
   if (!isPasswordValid) {
      throw new ApiError(401, "Invalid Users Credentials")
   }
   const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
   // this is use to make the cookies not nonModifiable on frontend it can oly be modified by server
   const options = {
      httpOnly: true,
      secure: true
   }
   return res.status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(
         new ApiResponse(
            200,
            { user: loggedInUser, accessToken, refreshToken },
            "User Logged In Successfully"
         )
      )
})

const logoutUser = asyncHandler(async (req, res) => {

   await User.findByIdAndUpdate(req.user._id, {
      $set: { refreshToken: undefined }
   }, { new: true })

   const options = {
      httpOnly: true,
      secure: true
   }

   return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
      new ApiResponse(200, {}, "User Logged Out Successfully")
   )

})


const refreshAccessToken = asyncHandler(async (req, res) => {


   try {
      const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

      if (!incomingRefreshToken) {
         throw new ApiError(401, "Unathorized Request")

      }

      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

      const user = await User.findById(decodedToken?._id)

      if (!user) {
         throw new ApiError(401, "Invalid Refresh Token")
      }
      if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh TOken is Expired or used")
      }

      const options = {
         httpOnly: true,
         secure: true
      }

      const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

      return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(new ApiResponse(201, { accessToken, refreshToken: newRefreshToken }, "Access Token Refresh SuccessFully"))
   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid Refresh Token")

   }



})

const changeCurrentPassword = asyncHandler(async (req, res) => {

   const { oldPassword, newPassword } = req.body()

   const user = await User.findByIdAndUpdate(req.user?._id)

   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
   if (!isPasswordCorrect) {
      throw new ApiError(400, "Password is incorrect")

   }

   user.password = newPassword
   await user.save({ validateBeforeSave: false })

   return res.status(200).json(new ApiResponse(200, {}, "Password Change Successsfully"))



})

const getCurrentUser = asyncHandler(async (req, res) => {
   return res.status(200).json(new ApiResponse(200, req.user, "Current User fetch successfully"))


})

const updateAccountDetails = asyncHandler(async (req, res) => {
   const { fullName, email } = req.body
   if (!fullName || !email) {
      throw new ApiError(400, "Invalid Credentials")
   }

   const user = await User.findByIdAndUpdate(req.user?._id, {
      $set: {
         fullName,
         email: email
      }
   }, {
      new: true
   }).select("-password")

   return res.status(200).json(new ApiResponse(200, user, "Account Details Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
   const avatarLoacalPath = req.file?.path

   if (!avatarLoacalPath) {
      throw new ApiError(400, "Avatar file is missing")

   }

   const avatar = await uploadOnCloudinary(avatarLoacalPath)

   if (!avatar.url) {
      throw new ApiError(500, "Error While uploading Avtar")
   }
   const user = await User.findByIdAndUpdate(req.user?._id, {
      $set: {
         avatar: avatar.url
      }
   }, {
      new: true
   }).select("-password")

   return res.status(200).json(new ApiResponse(200, user, "Avatar Updated SuccesFully"))

})
const updateUserCoverImage = asyncHandler(async (req, res) => {
   const coverImageLoacalPath = req.file?.path

   if (!coverImageLoacalPath) {
      throw new ApiError(400, "CoverImage file is missing")

   }

   const coverImage = await uploadOnCloudinary(coverImageLoacalPath)

   if (!coverImage.url) {
      throw new ApiError(500, "Error While uploading CoverImage")
   }
   const user = await User.findByIdAndUpdate(req.user?._id, {
      $set: {
         coverImage: coverImage.url
      }
   }, {
      new: true
   }).select("-password")

   return res.status(200).json(new ApiResponse(200, user, "CoverImage Updated SuccesFully"))

})

const getUserChannelProfile = asyncHandler(async (req, res) => {

   const { username } = req.params
   if (!username?.trim()) {
      throw new ApiError(400, "Username is missing")


   }
   const channel = User.aggregate(
      [
         {
            $match: {
               username: username?.toLowerCase()
            }
         },
         {
            //to get the all subscriber user have
            $lookup: {
               from: "subscriptions",
               localField: "_id",
               foreignField: "channel",
               as: "subscribers"
            }
         },
         {
            //to get all the channel user have subscribed
            $lookup: {
               from: "subscriptions",
               localField: "_id",
               foreignField: "subscriber",
               as: "subscribedTo"
            }
         },
         {
            $addFields: {
               subcriberCount: {
                  $size: "$subscribers"
               },
               channelsSubscribedToCount: {
                  $size: "$subscribedTo"
               }, isSubscribed: {
                  $cond: {
                     if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                     then: true,
                     else: false
                  }
               }
            }
         }, {
            $project: {
               fullName: 1,
               username: 1,
               subcriberCount: 1,
               channelsSubscribedToCount: 1,
               isSubscribed: 1,
               avatar: 1,
               coverImage: 1,
               email: 1



            }
         }

      ])

   if (!channel?.length()) {
      throw new ApiError(404, "Channel Does Not Exist ")
   }

   return res.status(200).json(new ApiResponse(200, channel[0], "User Channel Fetched"))
})

const getWatchHistory = asyncHandler(async (req, res) => {

   const user = await User.aggregate([
      {
         $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)

         }
      },
      {
         $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [{
               $lookup: {
                  from: "users",
                  localField: "owner",
                  foreignField: "_id",
                  as: "owner",
                  pipeline: [{
                     $project: {
                        fullName: 1,
                        username: 1,
                        avatar: 1
                     }
                  }]
               }

            }, {

               $addFields: {
                  $first: "$owner"
               }

            }]
         }
      }
   ])
   return res.stautus(200).json(new ApiResponse(200,user[0].watchHistory,"Watch History fetched Successfully"))
})
export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   changeCurrentPassword,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory

} 