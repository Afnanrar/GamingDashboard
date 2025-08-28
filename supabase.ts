import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions
export const auth = {
    // Sign up new business
    async signUp(email: string, password: string, businessData: any) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: businessData
            }
        })
        return { data, error }
    },

    // Sign in business
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        return { data, error }
    },

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut()
        return { error }
    },

    // Get current user
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser()
        return user
    },

    // Listen to auth changes
    onAuthStateChange(callback: (event: string, session: any) => void) {
        return supabase.auth.onAuthStateChange(callback)
    },

    // Get current session
    async getCurrentSession() {
        const { data: { session } } = await supabase.auth.getSession()
        return session
    }
}

// Database helper functions
export const db = {
    // Get business by email
    async getBusinessByEmail(email: string) {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('email', email)
            .single()
        return { data, error }
    },

    // Create business record
    async createBusiness(businessData: any) {
        const { data, error } = await supabase
            .from('businesses')
            .insert(businessData)
            .select()
            .single()
        return { data, error }
    },

    // Get business by auth user ID
    async getBusinessByAuthId(authUserId: string) {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('auth_user_id', authUserId)
            .single()
        return { data, error }
    },

    // Update business
    async updateBusiness(id: string, updates: any) {
        const { data, error } = await supabase
            .from('businesses')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        return { data, error }
    }
}
