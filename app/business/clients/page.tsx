'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Search, Check, X, User, Phone, Mail, Calendar, ArrowRight, UserCheck, UserX } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"

export default function BusinessClients() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // טעינת נתונים
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/business/login')
        return
      }

      // 1. עסק
      const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single()
      if (!biz) return
      setBusiness(biz)

      // 2. לקוחות (כולל פרופיל)
      const { data: allClients, error } = await supabase
        .from('business_clients')
        .select(`
          *,
          profiles:user_id (full_name, phone, email, avatar_url)
        `)
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })

      if (allClients) {
        setPendingRequests(allClients.filter((c: any) => c.status === 'PENDING'))
        setClients(allClients.filter((c: any) => c.status === 'APPROVED'))
      }
      
      setLoading(false)
    }
    fetchData()
  }, [])

  // פעולות אישור/דחייה/חסימה
  // הוספנו את 'BLOCKED' לרשימת הטיפוסים המותרים
  const handleStatusChange = async (clientId: string, newStatus: 'APPROVED' | 'REJECTED' | 'BLOCKED') => {
    // עדכון אופטימי ב-UI
    // אם זו בקשה חדשה (PENDING)
    const request = pendingRequests.find(r => r.id === clientId)
    if (request) {
        setPendingRequests(prev => prev.filter(r => r.id !== clientId))
        if (newStatus === 'APPROVED') {
            setClients(prev => [{ ...request, status: 'APPROVED' }, ...prev])
        }
    } else {
        // אם זה לקוח קיים (APPROVED) שאנחנו רוצים לחסום
        const client = clients.find(c => c.id === clientId)
        if (client && newStatus === 'BLOCKED') {
            setClients(prev => prev.filter(c => c.id !== clientId))
            // אפשר להוסיף לרשימת חסומים אם נרצה להציג אותם בעתיד
        }
    }

    // עדכון בשרת
    const { error } = await supabase
      .from('business_clients')
      .update({ status: newStatus })
      .eq('id', clientId)

    if (error) {
      alert("שגיאה בעדכון הסטטוס")
      console.error(error)
      // במקרה של שגיאה מומלץ לרענן את הדף
      window.location.reload()
    }
  }

  // סינון לקוחות פעילים
  const filteredClients = clients.filter(client => 
    client.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.profiles?.phone?.includes(searchTerm)
  )

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 text-right">ניהול לקוחות</h1>
            <p className="text-slate-500 text-right">אישור מצטרפים חדשים וצפייה במאגר הלקוחות</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/business/dashboard')}>
            <ArrowRight className="ml-2 h-4 w-4" /> חזרה לדשבורד
          </Button>
        </header>

        <Tabs defaultValue="pending" className="w-full" dir="rtl">
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="pending" className="gap-2">
              בקשות ממתינות
              {pendingRequests.length > 0 && <Badge variant="destructive" className="mr-1 rounded-full px-2">{pendingRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="active">לקוחות פעילים</TabsTrigger>
          </TabsList>

          {/* טאב 1: בקשות ממתינות */}
          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <Card className="bg-slate-50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <UserCheck size={48} className="mb-4 opacity-50" />
                  <p>אין בקשות הצטרפות חדשות כרגע.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingRequests.map((req) => (
                  <Card key={req.id} className="border-l-4 border-l-orange-400">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border">
                            <AvatarImage src={req.profiles?.avatar_url} />
                            <AvatarFallback className="bg-orange-100 text-orange-600">{req.profiles?.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="text-right">
                            <CardTitle className="text-lg">{req.profiles?.full_name || 'לקוח ללא שם'}</CardTitle>
                            <CardDescription>{format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">ממתין</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-slate-600 mb-4 text-right">
                        <div className="flex items-center gap-2 justify-start">
                          <Phone size={14} className="text-slate-400" />
                          <span>{req.profiles?.phone || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 justify-start">
                          <Mail size={14} className="text-slate-400" />
                          <span>{req.profiles?.email || '-'}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(req.id, 'APPROVED')}>
                          <Check className="ml-2 h-4 w-4" /> אשר בקשה
                        </Button>
                        <Button variant="outline" className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => handleStatusChange(req.id, 'REJECTED')}>
                          <X className="ml-2 h-4 w-4" /> דחה
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* טאב 2: לקוחות פעילים */}
          <TabsContent value="active" className="space-y-4">
            <div className="relative mb-4">
              <Search className="absolute right-3 top-3 text-slate-400" size={18} />
              <Input 
                placeholder="חיפוש לקוח לפי שם או טלפון..." 
                className="pr-10 text-right"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                    <tr>
                      <th className="p-4">שם הלקוח</th>
                      <th className="p-4">פרטי קשר</th>
                      <th className="p-4">תאריך הצטרפות</th>
                      <th className="p-4">סטטוס</th>
                      <th className="p-4 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          לא נמצאו לקוחות תואמים
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-medium flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={client.profiles?.avatar_url} />
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">{client.profiles?.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                            {client.profiles?.full_name}
                          </td>
                          <td className="p-4 text-slate-600">
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1"><Phone size={12}/> {client.profiles?.phone}</span>
                              <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={12}/> {client.profiles?.email}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600">
                            {format(new Date(client.created_at), 'dd/MM/yyyy')}
                          </td>
                          <td className="p-4">
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 shadow-none font-normal">פעיל</Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" title="חסום לקוח" onClick={() => handleStatusChange(client.id, 'BLOCKED')}>
                              <UserX size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}