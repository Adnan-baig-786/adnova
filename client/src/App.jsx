import React, { useRef, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Messages from './pages/Messages'
import ChatBox from './pages/ChatBox'
import Connections from './pages/Connections'
import Discover from './pages/Discover'
import Profile from './pages/Profile'
import CreatePost from './pages/CreatePost'
import { useUser, useAuth } from '@clerk/clerk-react'
import Layout from './pages/Layout'
import toast, { Toaster } from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { fetchUser } from './features/user/userSlice'
import { fetchConnections } from './features/connections/connectionSlice'
import { addMessage } from './features/messages/messagesSlice'
import Notification from './components/Notification'

const App = () => {
    const { user } = useUser()
    const { getToken } = useAuth()
    const { pathname } = useLocation()
    const pathnameRef = useRef(pathname)
    const dispatch = useDispatch()

    useEffect(() => {
      const fetchData = async () => {
        if (user) {
          try {
            const token = await getToken()
            if (token) {
              dispatch(fetchUser(token))
              dispatch(fetchConnections(token))
            }
          } catch (err) {
            console.error("fetchData error:", err)
          }
        }
      }
      fetchData()
    }, [user, getToken, dispatch])

    useEffect(() => {
      pathnameRef.current = pathname
    }, [pathname])

    useEffect(() => {
      if (user) {
        const baseUrl = import.meta.env.VITE_BASEURL || import.meta.env.VITE_BASE_URL || 'http://localhost:4000'
        let eventSource;
        try {
          eventSource = new EventSource(`${baseUrl}/api/message/${user.id}`);

          eventSource.onmessage = (event) => {
            try {
              if (!event.data || event.data.startsWith('Connected')) return
              const message = JSON.parse(event.data)
              if (pathnameRef.current === ('/messages/' + message.from_user_id?._id)) {
                dispatch(addMessage(message))
              } else {
                toast.custom((t) => (
                  <Notification t={t} message={message}/>
                ), { position: "bottom-right" })
              }
            } catch (parseErr) {
              // Ignore non-json SSE comments/messages
            }
          }

          eventSource.onerror = () => {
            // Reconnection handled automatically by browser
          }
        } catch (err) {
          console.error("SSE connection error:", err)
        }

        return () => {
          if (eventSource) {
            eventSource.close()
          }
        }
      }
    }, [user, dispatch])

    return (
      <>
        <Toaster/>
        <Routes>
          <Route path='/' element={!user ? <Login/> : <Layout/>}>
            <Route index element={<Feed/>}/>
            <Route path='messages' element={<Messages/>}/>
            <Route path='messages/:userId' element={<ChatBox/>}/>
            <Route path='connections' element={<Connections/>}/>
            <Route path='discover' element={<Discover/>}/>
            <Route path='profile' element={<Profile/>}/>
            <Route path='profile/:profileId' element={<Profile/>}/>
            <Route path='create-post' element={<CreatePost/>}/>
          </Route>
        </Routes>
      </>
    )
}

export default App
