'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // בדיקה אם יש יעד הפניה (למשל מכניסת אדמין)
  const nextUrl = searchParams.get('next')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // אם יש יעד הפניה - לך לשם, אחרת לדשבורד הרגיל
      if (nextUrl) {
        router.push(nextUrl)
      } else {
        router.push('/dashboard')
      }
      router.refresh()
      
    } catch (err: any) {
      setError('אימייל או סיסמה שגויים. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-slate-200">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">כניסת לקוחות</CardTitle>
        <CardDescription className="text-center">
          הזן את פרטי ההתחברות שלך
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-lg bg-blue-600 hover:bg-blue-700 mt-2" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'התחבר למערכת'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 text-center border-t bg-slate-50 p-6 rounded-b-xl">
        <div className="text-sm text-slate-600">
          אין לך חשבון עדיין?{' '}
          <Link href="/signup" className="text-blue-600 font-bold hover:underline">
            הירשם עכשיו בחינם
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-4 transition-colors">
          <ArrowRight size={16} />
          חזרה לדף הבית
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AvraSystem<span className="text-blue-600">.</span></h1>
        <p className="text-slate-500 mt-2">ברוכים השבים! התחבר כדי לנהל את התורים שלך</p>
      </div>
      
      {/* Suspense נדרש בגלל השימוש ב-useSearchParams */}
      <Suspense fallback={<Loader2 className="animate-spin" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}