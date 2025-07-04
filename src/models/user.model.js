
import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt"
import JWT from "jsonwebtoken"

const userSchema= new Schema
(
    {
        username:{
            type:String,
            reqired:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            type:String,
            reqired:true,
            unique:true,
            lowercase:true,
            trim:true,
            
        },
        fullName:{
            type:String,
            reqired:true,
            trim:true,
            index:true
        },
        avatar:{
            type:String,
            reqired:true
        },
        coverImage:{
            type:String,
            
        },
        watchHistory:[{
            type:Schema.Types.ObjectId,
            ref:"Video"
        }],
        password:{
            type:String,
            reqired:[true,"password is required"]
        },
        refreshToken:{
            type:String
        }

   
    
},
{timestamps:true})

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next()

     const salt=10
    this.password=await bcrypt.hash(this.password,salt)
    next()
})

userSchema.methods.isPasswordCorrect=async function(password) {
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken=function (){
    return JWT.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullName:this.fullName

    },process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    })
}
userSchema.methods.generateRefreshToken=function (){
    return JWT.sign({
        _id:this._id

    },process.env.REFRESH_TOKEN_SECRET,{
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    })
}
export  const  User=mongoose.model("User",userSchema)