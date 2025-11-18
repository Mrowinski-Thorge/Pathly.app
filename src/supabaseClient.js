import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bgxthgrxzyoqidazajba.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneHRoZ3J4enlvcWlkYXphamJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MjIwODAsImV4cCI6MjA3ODk5ODA4MH0.4Q8ZVwD7lXU6OImXKuLtJufyfIjYg9xb0fHIU3-y5rA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
