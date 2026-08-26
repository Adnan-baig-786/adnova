import mongoose from "mongoose";
import dns from "node:dns";

// Ensure SRV DNS lookup works reliably on Windows / all ISP networks
try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (err) {
    console.log("DNS setServers notice:", err.message);
}

const connectDB = async()=>{
    try {
        mongoose.connection.on('connected',()=>console.log('Database connected'))
        await mongoose.connect(`${process.env.MONGODB_URL}/adnova`)
    } catch (error) {
        console.log('Database connection error:', error.message)
    }
}

export default connectDB
