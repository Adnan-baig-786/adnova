import fs from "fs";
import imagekit from "../configs/imageKit.js";
import Story from "../models/Story.js";
import User from "../models/User.js";
import { inngest } from "../inngest/index.js";

// Add User Story
export const addUserStory = async (req, res) =>{
    try {
        const { userId } = req.auth();
        const {content, media_type, background_color} = req.body;
        const media = req.file
        let media_url = ''

        // upload media to imagekit
        if(media && (media_type === 'image' || media_type === 'video')){
            const fileBuffer = fs.readFileSync(media.path)
            const response = await imagekit.upload({
                file: fileBuffer,
                fileName: media.originalname,
            })
            media_url = response.url
        }
        // create story
        const story = await Story.create({
            user: userId,
            content: content || '',
            media_url,
            media_type: media_type || 'text',
            background_color: background_color || '#4f46e5'
        })

        // schedule story deletion after 24 hours
        try {
            await inngest.send({
                name: 'app/story.delete',
                data: { storyId: story._id }
            })
        } catch (inngestErr) {
            console.log("Inngest story delete notice:", inngestErr.message);
        }

        res.json({success: true, story})

    } catch (error) {
       console.log("addUserStory error:", error);
       res.json({ success: false, message: error.message }); 
    }
}

// Get User Stories
export const getStories = async (req, res) =>{
    try {
        const { userId } = req.auth();
        const user = await User.findById(userId)

        // User connections and followings 
        const userIds = [userId, ...(user?.connections || []), ...(user?.following || [])]

        const stories = await Story.find({
            user: {$in: userIds}
        }).populate('user').sort({ createdAt: -1 });

        res.json({ success: true, stories: stories || [] }); 
    } catch (error) {
       console.log("getStories error:", error);
       res.json({ success: false, message: error.message }); 
    }
}