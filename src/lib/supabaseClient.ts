import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://crconmdpaujoeeuadgkd.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyY29ubWRwYXVqb2VldWFkZ2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNTA2MzcsImV4cCI6MjA2OTkyNjYzN30.cMv-JVLBdVzXivLe3fjhum6munyRqkTHESgOlXUSrvY"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
