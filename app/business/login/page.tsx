'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Store, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BusinessLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. התחברות רגילה
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // 2. בדיקה האם המשתמש הוא באמת בעל עסק
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', data.user.id)
        .single()

      if (bizError || !business) {
        // אם הוא לא בעל עסק - ננתק אותו ונציג שגיאה
        await supabase.auth.signOut()
        throw new Error('משתמש זה אינו מוגדר כבעל עסק במערכת')
      }

      // הצלחה - מעבר לדשבורד העסקי
      router.push('/business/dashboard')
      router.refresh()
      
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'שגיאה בכניסה למערכת')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 text-slate-50">
      
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowRight size={16} />
          חזרה לדף הבית
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">AvraSystem<span className="text-blue-500">.</span> Business</h1>
        <p className="text-slate-400 mt-2">מערכת הניהול לעסקים</p>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-slate-950 text-slate-50">
        <CardHeader className="space-y-1">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <Store className="text-white" size={24} />
          </div>
          <CardTitle className="text-2xl font-bold text-center">כניסת מנהלים</CardTitle>
          <CardDescription className="text-center text-slate-400">
            הזן את פרטי הניהול שלך
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">אימייל עסקי</Label>
              <Input 
                id="email" 
                type="email" 
                className="bg-slate-900 border-slate-800 focus:border-blue-500 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password"className="text-slate-200">סיסמה</Label>
              <Input 
                id="password" 
                type="password" 
                className="bg-slate-900 border-slate-800 focus:border-blue-500 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full h-11 text-lg bg-blue-600 hover:bg-blue-700 mt-4" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'כניסה לניהול'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}