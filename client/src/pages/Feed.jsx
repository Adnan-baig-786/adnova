import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import Loading from '../components/Loading'
import StoriesBar from '../components/StoriesBar'
import PostCard from '../components/PostCard'
import RecentMessages from '../components/RecentMessages'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import api from '../api/axios'

const Feed = () => {
  const [feeds, setFeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const { getToken } = useAuth()

  const fetchfeeds = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      if (token) {
        const { data } = await api.get('/api/post/feed', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (data.success) {
          setFeeds(data.posts || [])
        } else {
          toast.error(data.message)
        }
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchfeeds()
  }, [])

  return !loading ? (
    <div className='h-full overflow-y-scroll no-scrollbar py-10 xl:pr-5 flex items-start justify-center xl:gap-8'>
      <div className='w-full max-w-2xl'>
        <StoriesBar/>
        <div className='p-4 space-y-6'>
          {feeds.length > 0 ? (
            feeds.map((post) => (
              <PostCard key={post._id} post={post} />
            ))
          ) : (
            <div className='bg-white rounded-xl shadow p-8 text-center text-slate-500'>
              <p className='text-lg font-medium text-slate-700 mb-1'>No posts yet</p>
              <p className='text-sm'>Create your first post or follow people to see posts in your feed!</p>
            </div>
          )}
        </div>
      </div>

      <div className='max-xl:hidden sticky top-0'>
        <div className='max-w-xs bg-white text-xs p-4 rounded-md inline-flex flex-col gap-2 shadow'>
          <h3 className='text-slate-800 font-semibold'>Sponsored</h3>
          <img src={assets.sponsored_img} className='w-75 h-50 rounded-md object-cover' alt="" />
          <p className='text-slate-600 font-medium'>CareerX</p>
          <p className='text-slate-400'>Build a better career with powerful AI tools for resumes, interviews, skills, and opportunities.</p>
        </div>
        <RecentMessages/>
      </div>
    </div>
  ) : <Loading/>
}

export default Feed