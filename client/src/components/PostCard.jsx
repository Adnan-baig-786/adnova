import React, { useState } from 'react'
import { BadgeCheck, Heart, MessageCircle, Share2 } from 'lucide-react'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const PostCard = ({ post }) => {
  const postWithHashtags = (post?.content || '').replace(/(#\w+)/g, '<span class="text-indigo-600 font-semibold">$1</span>')
  const [likes, setLikes] = useState(post?.likes_count || [])
  const currentUser = useSelector((state) => state.user.value)
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const handleLike = async () => {
    if (!currentUser?._id) return
    try {
      const token = await getToken()
      const { data } = await api.post(`/api/post/like`, { postId: post._id }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        toast.success(data.message)
        setLikes((prev) => {
          if (prev.includes(currentUser._id)) {
            return prev.filter((id) => id !== currentUser._id)
          } else {
            return [...prev, currentUser._id]
          }
        })
      } else {
        toast(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const isLiked = currentUser?._id && likes.includes(currentUser._id)

  return (
    <div className='bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-2xl'>
      <div onClick={() => post?.user?._id && navigate('/profile/' + post.user._id)} className='inline-flex items-center gap-3 cursor-pointer'>
        <img src={post?.user?.profile_picture || ''} alt="" className='w-10 h-10 rounded-full shadow object-cover'/>
        <div>
          <div className='flex items-center space-x-1'>
            <span className='font-medium text-slate-800'>{post?.user?.full_name || 'User'}</span>
            <BadgeCheck className='w-4 h-4 text-blue-500'/>
          </div>
          <div className='text-gray-500 text-sm'>@{post?.user?.username || 'user'} • {moment(post?.createdAt).fromNow()}</div>
        </div>
      </div>

      {/* Content */}
      {post?.content && (
        <div className='text-gray-800 text-sm whitespace-pre-line' dangerouslySetInnerHTML={{ __html: postWithHashtags }}/>
      )}

      {/* Images */}
      {post?.image_urls && post.image_urls.length > 0 && (
        <div className={`grid ${post.image_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
          {post.image_urls.map((img, index) => (
            <img src={img} key={index} className='w-full h-48 object-cover rounded-lg' alt="" />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className='flex items-center gap-6 text-gray-600 text-sm pt-2 border-t border-gray-100'>
        <div className='flex items-center gap-1.5 cursor-pointer' onClick={handleLike}>
          <Heart className={`w-4.5 h-4.5 transition ${isLiked ? 'text-red-500 fill-red-500' : 'hover:text-red-500'}`}/>
          <span>{likes.length}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <MessageCircle className="w-4.5 h-4.5 text-gray-500"/>
          <span>0</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <Share2 className="w-4.5 h-4.5 text-gray-500"/>
          <span>0</span>
        </div>
      </div>
    </div>
  )
}

export default PostCard