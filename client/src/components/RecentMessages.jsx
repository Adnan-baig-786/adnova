import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import moment from 'moment'
import { useAuth, useUser } from '@clerk/clerk-react'
import api from '../api/axios'

const RecentMessages = () => {
  const [messages, setMessages] = useState([])
  const { user } = useUser()
  const { getToken } = useAuth()

  const fetchRecentMessages = async () => {
    try {
      const token = await getToken()
      if (!token) return
      const { data } = await api.get('/api/user/recent-messages', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success && data.messages) {
        // Group messages by sender and get the latest message for each sender
        const groupedMessages = data.messages.reduce((acc, message) => {
          const senderId = message.from_user_id?._id;
          if (!senderId) return acc;
          if (!acc[senderId] || new Date(message.createdAt) > new Date(acc[senderId].createdAt)) {
            acc[senderId] = message
          }
          return acc;
        }, {})

        // Sort messages by date
        const sortedMessages = Object.values(groupedMessages).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setMessages(sortedMessages)
      }
    } catch (error) {
      console.error("fetchRecentMessages error:", error.message)
    }
  }

  useEffect(() => {
    if (user) {
      fetchRecentMessages()
      const intervalId = setInterval(fetchRecentMessages, 30000)
      return () => {
        clearInterval(intervalId)
      }
    }
  }, [user])

  return (
    <div className='bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md shadow text-xs text-slate-800'>
      <h3 className='font-semibold text-slate-800 mb-4'>Recent Messages</h3>
      <div className='flex flex-col max-h-56 overflow-y-scroll no-scrollbar'>
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <Link to={`/messages/${message.from_user_id?._id}`} key={message._id || index} className='flex items-start gap-2 py-2 hover:bg-slate-100 rounded-sm px-1'>
              <img src={message.from_user_id?.profile_picture || ''} alt="" className='w-8 h-8 rounded-full object-cover'/>
              <div className='w-full'>
                <div className='flex justify-between'>
                  <p className='font-medium text-slate-700'>{message.from_user_id?.full_name || 'User'}</p>
                  <p className='text-[10px] text-slate-400'>{moment(message.createdAt).fromNow()}</p>
                </div>
                <div className='flex justify-between'>
                  <p className='text-gray-500 truncate max-w-36'>{message.text ? message.text : 'Media'}</p>
                  {!message.seen && <p className='bg-indigo-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[10px]'>1</p>}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className='text-gray-400 py-2 text-center'>No recent messages</p>
        )}
      </div>
    </div>
  )
}

export default RecentMessages