// get user data by id
import { clerkClient } from "@clerk/express"
import User from "../models/User.js"
import fs from 'fs'
import imagekit from "../configs/imageKit.js"
import Connection from "../models/Connection.js"
import { inngest } from "../inngest/index.js"
import Post from '../models/Post.js'

export const getUserData = async (req, res) => {
    try {
        const { userId } = req.auth()
        if (!userId) {
            return res.json({ success: false, message: "Not authenticated" })
        }

        let user = await User.findById(userId)

        // If user not in MongoDB yet (e.g. initial login / webhook not reached), auto-sync from Clerk
        if (!user) {
            try {
                const clerkUser = await clerkClient.users.getUser(userId)
                if (clerkUser) {
                    const email = clerkUser.emailAddresses?.[0]?.emailAddress || ''
                    let username = clerkUser.username || (email ? email.split('@')[0] : `user_${userId.slice(-6)}`)

                    // Ensure unique username
                    const existingUser = await User.findOne({ username })
                    if (existingUser) {
                        username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`
                    }

                    const firstName = clerkUser.firstName || ''
                    const lastName = clerkUser.lastName || ''
                    const fullName = (firstName + ' ' + lastName).trim() || username

                    user = await User.create({
                        _id: userId,
                        email,
                        full_name: fullName,
                        username,
                        profile_picture: clerkUser.imageUrl || '',
                        bio: 'Hey there! I am using Adnova',
                        followers: [],
                        following: [],
                        connections: []
                    })
                }
            } catch (clerkErr) {
                console.log("Clerk fetch user error:", clerkErr.message)
            }
        }

        if (!user) {
            return res.json({ success: false, message: "user not found" })
        }

        res.json({ success: true, user })
    } catch (error) {
        console.log("getUserData error:", error);
        res.json({ success: false, message: error.message })
    }
}

// update user data
export const updateUserData = async (req, res) => {
    try {
        const { userId } = req.auth()
        let { username, bio, location, full_name } = req.body;

        const tempUser = await User.findById(userId)
        if (!tempUser) {
            return res.json({ success: false, message: "User not found" })
        }

        !username && (username = tempUser.username)

        if (tempUser.username !== username) {
            const userExists = await User.findOne({ username })
            if (userExists && userExists._id !== userId) {
                username = tempUser.username
            }
        }

        const updatedData = {
            username,
            bio: bio !== undefined ? bio : tempUser.bio,
            location: location !== undefined ? location : tempUser.location,
            full_name: full_name || tempUser.full_name
        }

        const profile = req.files?.profile && req.files.profile[0]
        const cover = req.files?.cover && req.files.cover[0]

        if (profile) {
            const buffer = fs.readFileSync(profile.path)
            const response = await imagekit.upload({
                file: buffer,
                fileName: profile.originalname,
            })

            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: 'auto' },
                    { format: 'webp' },
                    { width: '512' }
                ]
            })
            updatedData.profile_picture = url;

            try {
                const blob = await fetch(url).then(res => res.blob());
                await clerkClient.users.updateUserProfileImage(userId, { file: blob });
            } catch (err) {
                console.log("Clerk profile image update error:", err.message);
            }
        }

        if (cover) {
            const buffer = fs.readFileSync(cover.path)
            const response = await imagekit.upload({
                file: buffer,
                fileName: cover.originalname,
            })
            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: 'auto' },
                    { format: 'webp' },
                    { width: '1280' }
                ]
            })
            updatedData.cover_photo = url;
        }

        const user = await User.findByIdAndUpdate(userId, updatedData, { new: true })
        res.json({ success: true, user, message: 'profile updated successfully' })
    } catch (error) {
        console.log("updateUserData error:", error);
        res.json({ success: false, message: error.message })
    }
}

// find username / discover users
export const discoverUser = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { input } = req.body;

        const query = input ? {
            $or: [
                { username: new RegExp(input, 'i') },
                { email: new RegExp(input, 'i') },
                { full_name: new RegExp(input, 'i') },
                { location: new RegExp(input, 'i') },
            ]
        } : {}

        const allUsers = await User.find(query)
        const filteredUsers = allUsers.filter(user => user._id !== userId);
        res.json({ success: true, users: filteredUsers })
    } catch (error) {
        console.log("discoverUser error:", error);
        res.json({ success: false, message: error.message })
    }
}

// follow user
export const followUser = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { id } = req.body;

        const user = await User.findById(userId)
        if (!user) {
            return res.json({ success: false, message: "User not found" })
        }

        if (user.following && user.following.includes(id)) {
            return res.json({ success: false, message: 'You are already following this user' })
        }

        user.following = user.following || []
        user.following.push(id);
        await user.save()

        const toUser = await User.findById(id)
        if (toUser) {
            toUser.followers = toUser.followers || []
            toUser.followers.push(userId)
            await toUser.save()
        }

        res.json({ success: true, message: 'Now you are following this user' })
    } catch (error) {
        console.log("followUser error:", error);
        res.json({ success: false, message: error.message })
    }
}

// unfollow user
export const unfollowUser = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { id } = req.body;

        const user = await User.findById(userId)
        if (!user) {
            return res.json({ success: false, message: "User not found" })
        }

        user.following = (user.following || []).filter(uId => uId !== id);
        await user.save()

        const toUser = await User.findById(id)
        if (toUser) {
            toUser.followers = (toUser.followers || []).filter(uId => uId !== userId)
            await toUser.save()
        }

        res.json({ success: true, message: 'You are no longer following this user' })
    } catch (error) {
        console.log("unfollowUser error:", error);
        res.json({ success: false, message: error.message })
    }
}

// send connection request
export const sendConnectionRequest = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { id } = req.body;

        if (userId === id) {
            return res.json({ success: false, message: "Cannot send connection request to yourself" })
        }

        // Limit to max 20 requests in 24 hours
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const connectionRequests = await Connection.find({ from_user_id: userId, created_at: { $gt: last24Hours } })
        if (connectionRequests.length >= 20) {
            return res.json({ success: false, message: 'You have sent more than 20 connection requests in the last 24 hours' })
        }

        // Check if connection already exists
        const connection = await Connection.findOne({
            $or: [
                { from_user_id: userId, to_user_id: id },
                { from_user_id: id, to_user_id: userId },
            ]
        })

        if (!connection) {
            const newConnection = await Connection.create({
                from_user_id: userId,
                to_user_id: id
            })
            try {
                await inngest.send({
                    name: 'app/connection-request',
                    data: { connectionId: newConnection._id }
                })
            } catch (inngestErr) {
                console.log("Inngest send notice:", inngestErr.message);
            }

            return res.json({ success: true, message: 'Connection request sent successfully' })
        } else if (connection.status === 'accepted') {
            return res.json({ success: false, message: 'You are already connected with this user' })
        }
        return res.json({ success: false, message: 'Connection request pending' })
    } catch (error) {
        console.log("sendConnectionRequest error:", error);
        res.json({ success: false, message: error.message })
    }
}

// get user connections
export const getUserConnections = async (req, res) => {
    try {
        const { userId } = req.auth()
        const user = await User.findById(userId).populate('connections followers following')

        if (!user) {
            return res.json({ success: true, connections: [], followers: [], following: [], pendingConnections: [] })
        }

        const connections = (user.connections || []).filter(Boolean)
        const followers = (user.followers || []).filter(Boolean)
        const following = (user.following || []).filter(Boolean)

        const pendingList = await Connection.find({ to_user_id: userId, status: 'pending' }).populate('from_user_id')
        const pendingConnections = pendingList.map(c => c.from_user_id).filter(Boolean)

        res.json({ success: true, connections, followers, following, pendingConnections })
    } catch (error) {
        console.log("getUserConnections error:", error);
        res.json({ success: false, message: error.message })
    }
}

// Accept Connection Request
export const acceptConnectionRequest = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { id } = req.body;

        const connection = await Connection.findOne({ from_user_id: id, to_user_id: userId })

        if (!connection) {
            return res.json({ success: false, message: 'Connection not found' });
        }

        const user = await User.findById(userId);
        if (user) {
            user.connections = user.connections || []
            if (!user.connections.includes(id)) {
                user.connections.push(id);
                await user.save()
            }
        }

        const toUser = await User.findById(id);
        if (toUser) {
            toUser.connections = toUser.connections || []
            if (!toUser.connections.includes(userId)) {
                toUser.connections.push(userId);
                await toUser.save()
            }
        }

        connection.status = 'accepted';
        await connection.save()

        res.json({ success: true, message: 'Connection accepted successfully' });
    } catch (error) {
        console.log("acceptConnectionRequest error:", error);
        res.json({ success: false, message: error.message })
    }
}

// Get User Profiles
export const getUserProfiles = async (req, res) => {
    try {
        const { profileId } = req.body;
        if (!profileId) {
            return res.json({ success: false, message: "Profile ID required" });
        }

        let profile = await User.findById(profileId)
        if (!profile) {
            // Try fetching from Clerk as fallback
            try {
                const clerkUser = await clerkClient.users.getUser(profileId)
                if (clerkUser) {
                    const email = clerkUser.emailAddresses?.[0]?.emailAddress || ''
                    let username = clerkUser.username || (email ? email.split('@')[0] : `user_${profileId.slice(-6)}`)
                    const fullName = ([clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ')) || username
                    profile = await User.create({
                        _id: profileId,
                        email,
                        full_name: fullName,
                        username,
                        profile_picture: clerkUser.imageUrl || '',
                        followers: [],
                        following: [],
                        connections: []
                    })
                }
            } catch (err) {
                console.log("Clerk fallback profile lookup notice:", err.message)
            }
        }

        if (!profile) {
            return res.json({ success: false, message: "Profile not found" });
        }

        const posts = await Post.find({ user: profileId }).populate('user').sort({ createdAt: -1 })

        res.json({ success: true, profile, posts })
    } catch (error) {
        console.log("getUserProfiles error:", error);
        res.json({ success: false, message: error.message })
    }
}