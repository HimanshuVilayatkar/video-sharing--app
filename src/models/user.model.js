
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
        avtar:{
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
    if(!this.Modified("password")) return next()


    this.password=bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect=async function(password) {
    return await bcrypt.compare(password,this.password)
}

userchema.methods.generateAccessToken=function (){
    return JWT.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullName:this.fullName

    },process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    })
}
userchema.methods.generateRefreshToken=function (){
    return JWT.sign({
        _id:this._id

    },process.env.REFRESH_TOKEN_SECRET,{
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    })
}
export const User=mongoose.model("User",userSchema)