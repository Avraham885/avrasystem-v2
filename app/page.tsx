'use client'

import { useState, useEffect } from 'react'
import { Search, Calendar, MessageSquare, LogIn, Store, X, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function LandingPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [businesses, setBusinesses] = useState<any[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null)
  
  const supabase = createClient()

  useEffect(() => {
    const fetchBusinesses = async () => {
      if (searchTerm.length < 2) { setBusinesses([]); return }
      const { data } = await supabase.from('businesses').select('id, name, slug, logo_url, address').ilike('name', `%${searchTerm}%`).limit(5)
      if (data) setBusinesses(data)
    }
    const timeoutId = setTimeout(fetchBusinesses, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors"><LogIn size={18} /><span>כניסת לקוחות</span></Link>
          <div className="font-bold text-2xl text-slate-800 tracking-tight absolute left-1/2 transform -translate-x-1/2">AvraSystem<span className="text-blue-600">.</span></div>
          <Link href="/business/login" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors"><span>כניסת עסקים</span><Store size={18} /></Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

        <div className="text-center z-10 max-w-2xl w-full">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">ניהול תורים <br/><span className="text-blue-600">חכם, פשוט ומהיר</span></h1>
          <p className="text-lg text-slate-500 mb-10 leading-relaxed max-w-lg mx-auto">המערכת המתקדמת לניהול העסק שלך. קביעת תורים, ניהול לקוחות ומעקב אישי - הכל במקום אחד, נגיש מכל מקום.</p>

          {!isSearchOpen ? (
            <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Button onClick={() => setIsSearchOpen(true)} size="lg" className="w-full md:w-auto text-lg px-8 py-6 rounded-2xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all bg-blue-600 hover:bg-blue-700">
                <Calendar className="ml-2 w-5 h-5" /> קבע תור / יצירת קשר לעסק
              </Button>
            </div>
          ) : (
            <Card className="w-full max-w-lg mx-auto overflow-hidden border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
              <CardContent className="p-6">
                {!selectedBusiness ? (
                  <>
                    <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-slate-700">חיפוש עסק</h3><button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
                    <div className="relative mb-4"><Search className="absolute right-3 top-3.5 text-slate-400" size={20} /><Input type="text" placeholder="הקלד שם עסק (למשל: מספרה...)" className="pr-10 h-12 text-lg bg-slate-50 border-slate-200 focus-visible:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus /></div>
                    <div className="flex flex-col gap-2 min-h-[100px]">
                      {businesses.length > 0 ? (
                        businesses.map((biz) => (
                          <div key={biz.id} onClick={() => setSelectedBusiness(biz)} className="flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-blue-100 group text-right">
                            <div className="w-12 h-12 bg-white rounded-full border border-slate-100 flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center">{biz.logo_url ? <img src={biz.logo_url} alt={biz.name} className="w-full h-full object-cover" /> : <Store className="text-slate-300" size={24} />}</div>
                            <div><div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{biz.name}</div><div className="text-xs text-slate-500 truncate max-w-[200px]">{biz.address || 'כתובת לא צוינה'}</div></div>
                          </div>
                        ))
                      ) : (
                        searchTerm.length > 1 && <div className="text-center py-8 text-slate-400">לא נמצאו עסקים בשם זה</div>
                      )}
                      {searchTerm.length < 2 && <div className="text-center py-8 text-slate-400 text-sm">התחל להקליד כדי לחפש...</div>}
                    </div>
                  </>
                ) : (
                  <div className="text-center pt-2">
                    <div className="mb-8"><div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">{selectedBusiness.logo_url ? <img src={selectedBusiness.logo_url} alt="Logo" className="w-full h-full rounded-full object-cover" /> : <Store size={32} />}</div><h3 className="text-2xl font-bold text-slate-800">ברוכים הבאים ל{selectedBusiness.name}</h3><p className="text-slate-500 text-sm mt-2">בחר כיצד להמשיך</p></div>
                    <div className="grid grid-cols-1 gap-4">
                      <Link href={`/book/${selectedBusiness.slug}?type=consultation`} className="w-full"><Button variant="outline" className="w-full h-auto py-4 flex items-center justify-start gap-4 border-slate-200 hover:border-blue-500 hover:bg-blue-50 group"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><MessageSquare size={20} /></div><div className="text-right"><div className="font-bold text-slate-800">ייעוץ / יצירת קשר</div><div className="text-xs text-slate-500">ללקוחות חדשים ומתעניינים</div></div></Button></Link>
                      <Link href={`/book/${selectedBusiness.slug}?type=appointment`} className="w-full"><Button variant="outline" className="w-full h-auto py-4 flex items-center justify-start gap-4 border-slate-200 hover:border-green-500 hover:bg-green-50 group"><div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Calendar size={20} /></div><div className="text-right"><div className="font-bold text-slate-800">קביעת תור</div><div className="text-xs text-slate-500">הזמנת טיפול ביומן</div></div></Button></Link>
                    </div>
                    <button onClick={() => setSelectedBusiness(null)} className="mt-6 text-sm text-slate-400 hover:text-slate-600 underline underline-offset-4">חזרה לחיפוש עסק אחר</button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-right">
          <div className="text-slate-500 text-sm font-medium">
            <div>© 2025 כל הזכויות שמורות - AvraSystem</div>
            {/* כפתור אדמין מוסתר */}
            <Link href="/admin" className="text-xs text-slate-300 hover:text-blue-500 mt-2 flex items-center gap-1"><Shield size={10}/> כניסת מנהל מערכת</Link>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
             <div className="text-slate-800 font-bold text-sm">מייסד ומפתח: אברהם מועלם</div>
             <div className="text-slate-500 text-xs flex gap-3 dir-ltr"><span className="hover:text-blue-600 transition-colors">avram885@gmail.com</span><span>|</span><span className="hover:text-blue-600 transition-colors">052-6788859</span></div>
             <div className="text-blue-600 text-xs font-medium mt-2 cursor-pointer hover:underline bg-blue-50 px-3 py-1 rounded-full">רוצים גם לנהל את התורים שלכם בצורה חכמה? צרו קשר</div>
          </div>
        </div>
      </footer>
    </div>
  )
}