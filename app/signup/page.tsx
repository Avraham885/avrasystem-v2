'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. יצירת המשתמש ב-Supabase Auth
      // אנו מעבירים את ה-full_name וה-phone במטא-דאטה, והטריגר ב-SQL ידאג לשמור אותם בטבלת profiles
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone, // הוספנו גם את הטלפון למטא-דאטה כדי שהטריגר יוכל להשתמש בו (אם נעדכן אותו)
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('שגיאה ביצירת המשתמש')

      // הסרנו את שלב יצירת הפרופיל הידנית (profile insert) כדי למנוע שגיאת 401.
      // הטריגר ב-SQL יעשה זאת עבורנו.

      // הצלחה!
      alert('ההרשמה בוצעה בהצלחה! אתה מועבר לדשבורד...')
      router.push('/dashboard')
      router.refresh()

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'אירעה שגיאה בהרשמה. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-4 transition-colors">
          <ArrowRight size={16} />
          חזרה לדף הבית
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AvraSystem<span className="text-blue-600">.</span></h1>
        <p className="text-slate-500 mt-2">הצטרף אלינו ונהל את התורים שלך בקלות</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">יצירת חשבון חדש</CardTitle>
          <CardDescription className="text-center">
            מלא את הפרטים הבאים להרשמה מהירה
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">שם מלא</Label>
              <Input 
                id="fullName" 
                placeholder="ישראל ישראלי" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">טלפון נייד</Label>
              <Input 
                id="phone" 
                placeholder="050-0000000" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

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
                  minLength={6}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-500">מינימום 6 תווים</p>
            </div>

            <Button type="submit" className="w-full h-11 text-lg bg-blue-600 hover:bg-blue-700 mt-4" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'צור חשבון'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center border-t bg-slate-50 p-6 rounded-b-xl">
          <div className="text-sm text-slate-600">
            כבר יש לך חשבון?{' '}
            <Link href="/login" className="text-blue-600 font-bold hover:underline">
              התחבר כאן
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}