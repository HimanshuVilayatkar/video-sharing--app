
import dotenv from "dotenv"
import { app } from "./app.js";
import connectDB from "./db/index.js";
dotenv.config({
    path:"./env"
})
connectDB()
.then(()=>{
    app.listen(process.env.PORT||5000,()=>{
        console.log("MongoDB connected at port",`${process.env.PORT}`)
    })
}
)
.catch((err)=>{
    console.log("error in mongodb connection failed",error)
})




