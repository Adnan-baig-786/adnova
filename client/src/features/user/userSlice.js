import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios.js'
import toast from 'react-hot-toast'

const initialState = {
    value: null,
    loading: false
}

export const fetchUser = createAsyncThunk('user/fetchUser', async (token) => {
    try {
        const { data } = await api.get('/api/user/data', {
            headers: { Authorization: `Bearer ${token}` }
        })
        return data.success ? data.user : null
    } catch (err) {
        console.error("fetchUser error:", err);
        return null;
    }
})

export const updateUser = createAsyncThunk('user/update', async ({userData, token}) => {
    try {
        const { data } = await api.post('/api/user/update', userData, {
            headers: { Authorization: `Bearer ${token}` }
        })
        if (data.success) {
            toast.success(data.message)
            return data.user
        } else {
            toast.error(data.message)
            return null
        }
    } catch (err) {
        toast.error(err.message)
        return null
    }
})

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        clearUser: (state) => {
            state.value = null
        }
    },
    extraReducers: (builder)=>{
        builder.addCase(fetchUser.fulfilled, (state, action)=>{
            state.value = action.payload
        }).addCase(fetchUser.rejected, (state)=>{
            state.value = null
        }).addCase(updateUser.fulfilled, (state, action)=>{
            if (action.payload) {
                state.value = action.payload
            }
        })
    }
})

export const { clearUser } = userSlice.actions
export default userSlice.reducer