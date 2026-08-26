export const protect = async (req, res, next) => {
    console.log("req.headers.authorization:", req.headers.authorization);

    try {
        const {userId} = await req.auth();
        if(!userId){
            return res.json({success: false, message: "not authenticated"  })
        }
        next()
    } catch (error) {
        res.json({success: false, message: error.message  })
    }
}