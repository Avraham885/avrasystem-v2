'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Building, Plus, User, Save, Trash2, Search, ArrowRight, LogOut, Users, Link as LinkIcon, Key, ShieldAlert } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBusinessWithOwner } from '../actions'

export default function SuperAdminPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newBiz, setNewBiz] = useState({ 
    name: '', slug: '', description: '', 
    owner_name: '', owner_email: '', owner_phone: '', owner_password: '' 
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { 
        // תיקון: הפניה ללוגין עם פרמטר חזרה
        router.push('/login?next=/admin')
        return 
      }

      const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
      if (!profile || !profile.is_super_admin) { alert("אין גישה"); router.push('/'); return }

      fetchData()
    }
    checkAdmin()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // 1. שליפת עסקים
    const { data: bizData, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (bizError) console.error("Error fetching businesses:", bizError)
    const businessesRaw = bizData || []

    // 2. שליפת בעלים
    const ownerIds = businessesRaw.map(b => b.owner_id).filter(Boolean)
    let profilesMap: Record<string, any> = {}
    
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ownerIds)
      profiles?.forEach(p => { profilesMap[p.id] = p })
    }

    const businessesWithOwners = businessesRaw.map(biz => ({
      ...biz,
      owner: profilesMap[biz.owner_id] || null
    }))

    setBusinesses(businessesWithOwners)

    // 3. משתמשים
    const { data: userData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setAllUsers(userData || [])

    // 4. קשרים
    const { data: connData } = await supabase.from('business_clients').select('*, businesses(name), profiles:user_id(full_name, email)').order('created_at', { ascending: false })
    setConnections(connData || [])

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleCreate = async () => {
    if (!newBiz.name || !newBiz.owner_email || !newBiz.owner_password) {
      alert("חובה למלא שם עסק, אימייל וסיסמה")
      return
    }
    setCreating(true)
    
    try {
      const result = await createBusinessWithOwner(newBiz)

      if (result.success) {
        alert("העסק והמשתמש נוצרו בהצלחה!")
        setIsCreateOpen(false)
        setNewBiz({ name: '', slug: '', description: '', owner_name: '', owner_email: '', owner_phone: '', owner_password: '' })
        setTimeout(() => fetchData(), 1000)
      } else {
        alert("שגיאה: " + result.error)
      }
    } catch (e) {
      console.error(e)
      alert("שגיאה בלתי צפויה")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm("למחוק את העסק? פעולה זו אינה הפיכה!")) return
    await supabase.from('businesses').delete().eq('id', id)
    fetchData()
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-right" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ניהול מערכת (Super Admin)</h1>
            <p className="text-slate-500">שליטה מלאה על העסקים, המשתמשים והחיבורים</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/')}><ArrowRight className="ml-2 h-4 w-4"/> לאתר</Button>
            <Button variant="destructive" onClick={handleLogout}><LogOut className="ml-2 h-4 w-4"/> התנתק</Button>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="ml-2 h-4 w-4"/> הקם עסק חדש</Button>
          </div>
        </header>

        <Tabs defaultValue="businesses" className="w-full" dir="rtl">
          <TabsList className="mb-6 w-full justify-start bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="businesses" className="flex-1">עסקים ({businesses.length})</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">משתמשים ({allUsers.length})</TabsTrigger>
            <TabsTrigger value="connections" className="flex-1">חברויות פעילות ({connections.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="businesses">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {businesses.map((biz) => (
                <Card key={biz.id} className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-500 relative group text-right">
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-8 w-8" onClick={() => handleDeleteBusiness(biz.id)}><Trash2 size={16}/></Button>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500 text-xl border border-slate-200">
                        {biz.logo_url ? <img src={biz.logo_url} className="w-full h-full object-cover rounded-lg"/> : biz.name[0]}
                      </div>
                    </div>
                    <CardTitle className="mt-2 text-right">{biz.name}</CardTitle>
                    <CardDescription className="text-right">{biz.description || 'אין תיאור'}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm bg-slate-50/50 p-4 border-t mt-2 text-right">
                    <div className="flex items-center gap-2 mb-2"><Building size={14} className="text-slate-400"/><span className="font-mono text-xs bg-slate-200 px-1 rounded">{biz.slug}</span></div>
                    <div className="flex items-center gap-2 mb-2"><User size={14} className="text-slate-400"/><span className="text-slate-600">{biz.owner ? `${biz.owner.full_name} (${biz.owner.email})` : 'ללא בעלים'}</span></div>
                    <div className="mt-2 text-left"><a href={`/book/${biz.slug}`} target="_blank" className="text-blue-600 text-xs hover:underline flex items-center justify-end gap-1">פתח דף עסק <ArrowRight size={10} className="rotate-180" /></a></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 border-b"><tr><th className="p-4 text-right">שם מלא</th><th className="p-4 text-right">אימייל</th><th className="p-4 text-right">טלפון</th><th className="p-4 text-right">נוצר ב-</th></tr></thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id} className="border-b hover:bg-slate-50/50">
                        <td className="p-4 font-medium">{u.full_name} {u.is_super_admin && <span className="text-xs bg-red-100 text-red-600 px-1 rounded mr-2">ADMIN</span>}</td>
                        <td className="p-4">{u.email}</td>
                        <td className="p-4">{u.phone}</td>
                        <td className="p-4">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="connections">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 border-b"><tr><th className="p-4 text-right">לקוח</th><th className="p-4 text-right">עסק</th><th className="p-4 text-right">סטטוס</th></tr></thead>
                  <tbody>
                    {connections.map(c => (
                      <tr key={c.id} className="border-b hover:bg-slate-50/50">
                        <td className="p-4 font-medium">{c.profiles?.full_name} <span className="text-xs text-slate-400">({c.profiles?.email})</span></td>
                        <td className="p-4">{c.businesses?.name}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${c.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[600px] text-right" dir="rtl">
            <DialogHeader><DialogTitle className="text-right">הקמת עסק ומשתמש מנהל</DialogTitle></DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="border p-4 rounded bg-blue-50/50">
                <h3 className="font-bold mb-3 text-blue-800 flex items-center gap-2"><Building size={16}/> פרטי העסק</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-right block">שם העסק</Label><Input className="text-right" value={newBiz.name} onChange={(e) => setNewBiz({...newBiz, name: e.target.value})} placeholder="מספרת דוד" /></div>
                  <div className="space-y-1"><Label className="text-right block">Slug (באנגלית)</Label><Input className="text-right" value={newBiz.slug} onChange={(e) => setNewBiz({...newBiz, slug: e.target.value})} placeholder="david-hair" /></div>
                  <div className="col-span-2 space-y-1"><Label className="text-right block">תיאור</Label><Input className="text-right" value={newBiz.description} onChange={(e) => setNewBiz({...newBiz, description: e.target.value})} /></div>
                </div>
              </div>
              <div className="border p-4 rounded bg-green-50/50">
                <h3 className="font-bold mb-3 text-green-800 flex items-center gap-2"><User size={16}/> פרטי מנהל העסק (משתמש חדש)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-right block">שם מלא</Label><Input className="text-right" value={newBiz.owner_name} onChange={(e) => setNewBiz({...newBiz, owner_name: e.target.value})} /></div>
                  <div className="space-y-1"><Label className="text-right block">טלפון</Label><Input className="text-right" value={newBiz.owner_phone} onChange={(e) => setNewBiz({...newBiz, owner_phone: e.target.value})} /></div>
                  <div className="space-y-1"><Label className="text-right block">אימייל</Label><Input className="text-right" type="email" value={newBiz.owner_email} onChange={(e) => setNewBiz({...newBiz, owner_email: e.target.value})} /></div>
                  <div className="space-y-1"><Label className="text-right block">סיסמה ראשונית</Label><Input className="text-right" type="text" value={newBiz.owner_password} onChange={(e) => setNewBiz({...newBiz, owner_password: e.target.value})} placeholder="מינימום 6 תווים" /></div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button onClick={handleCreate} disabled={creating} className="bg-blue-600 hover:bg-blue-700">{creating ? <Loader2 className="animate-spin ml-2" /> : 'צור עסק ומשתמש'}</Button>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>ביטול</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}