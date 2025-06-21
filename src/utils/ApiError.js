class ApiError extends Error{
    constructor(
        statusCode,
        message="something went wrong",
        errors=[],
        statck=""
    ){
        this.statusCode=statusCode
        this.data=null
        this.message=message
        this.success=false
        this.errors=errors


        if(statck){
            this.statck=statck
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}