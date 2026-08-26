import React, { useState } from 'react'
import { Image, X } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const CreatePost = () => {
  const navigate = useNavigate()
  const [content, setContent] = useState('')  
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)

  const user = useSelector((state) => state.user.value);
  const { getToken } = useAuth()

  const removeImage = (indexToRemove) => {
    setImages(images.filter((_, i) => i !== indexToRemove))
  }

  const handleSubmit = async () => {
    if (!images.length && !content.trim()) {
      toast.error('Please add at least one image or text')
      return
    }
    setLoading(true)
    const postType = images.length && content ? 'text_with_image' : images.length ? 'image' : 'text'

    try {
      const formData = new FormData();
      formData.append('content', content)
      formData.append('post_type', postType)
      images.forEach((image) => {
        formData.append('images', image)
      })

      const token = await getToken()
      const { data } = await api.post('/api/post/add', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        toast.success('Post created successfully')
        navigate('/')
      } else {
        toast.error(data.message || 'Post failed')
      }
    } catch (error) {
      toast.error(error.message || 'Post failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white'>
      <div className='max-w-6xl mx-auto p-6'>
         {/* Title */}    
         <div className='mb-8'>
          <h1 className='text-3xl font-bold text-slate-900 mb-2'>Create Post</h1>
          <p className='text-slate-600'>Share your thoughts with the world</p>
         </div>

         {/* Form */}
         <div className='max-w-xl bg-white p-4 sm:p-8 sm:pb-3 rounded-xl shadow-md space-y-4'>
            {/* Header */}
            <div className='flex items-center gap-3'>
              <img src={user?.profile_picture || ''} alt="" className='w-12 h-12 rounded-full shadow object-cover'/>
              <div>
                <h2 className='font-semibold'>{user?.full_name || 'User'}</h2>
                <p className='text-sm text-gray-500'>@{user?.username || 'user'}</p>
              </div>
            </div>

            {/* Text Area */}
            <textarea className='w-full resize-none max-h-24 mt-4 text-sm outline-none placeholder-gray-400' placeholder="What's happening?" onChange={(e)=>setContent(e.target.value)} value={content}/>

             {/* Images */}
             {
              images.length > 0 && <div className='flex flex-wrap gap-2 mt-4'>
                {images.map((image, i)=>(
                    <div key={i} className='relative group'>
                      <img src={URL.createObjectURL(image)} className='h-20 rounded-md object-cover' alt=""/>
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5 text-white cursor-pointer">
                        <X className="w-4 h-4"/>
                      </button>
                    </div>
                  ))}
                  </div>
             }

              {/* Bottom Bar */}
             <div className='flex items-center justify-between pt-3 border-t border-gray-300'>
              <label htmlFor="images" className='flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer'>
                <Image className='size-6'/>
              </label>
                <input type="file" id="images" accept='image/*' hidden multiple onChange={(e)=>setImages([...images, ...Array.from(e.target.files)])}/>

                <button disabled={loading} onClick={handleSubmit} className='text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition text-white font-medium px-8 py-2 rounded-md cursor-pointer disabled:opacity-50'>
                  {loading ? 'Publishing...' : 'Publish Post'}
                </button>
             </div>
         </div>
      </div>
    </div>
  )
}

export default CreatePost