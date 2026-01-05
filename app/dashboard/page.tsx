'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin, User, Building, LogOut, Loader2, Search, AlertCircle, MessageSquare, Edit2, Save, X, HelpCircle, ImageIcon, Lock, Upload, Camera } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { he } from "date-fns/locale"

// --- Types ---
type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
}

type Appointment = {
  id: string
  start_time: string
  status: string
  business_public_notes: string | null
  image_urls: string[] | null
  businesses: {
    name: string
    address: string
  } | null
  services: {
    name: string
    duration_minutes: number
  } | null
}

type Inquiry = {
  id: string
  created_at: string
  subject: string | null
  message: string | null
  reply: string | null
  image_urls: string[] | null
  status: string
  businesses: {
    name: string
  } | null
}

type Membership = {
  status: string
  businesses: {
    name: string
    slug: string
    logo_url: string | null
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [viewingImages, setViewingImages] = useState<string[] | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(profileData)
        setEditForm({ full_name: profileData?.full_name || '', phone: profileData?.phone || '' })

        const { data: appData } = await supabase.from('appointments').select(`id, start_time, status, business_public_notes, image_urls, businesses (name, address), services (name, duration_minutes)`).eq('client_id', user.id).order('start_time', { ascending: false })
        setAppointments(appData as any || [])

        const { data: inqData } = await supabase.from('inquiries').select(`id, created_at, subject, message, status, reply, image_urls, businesses (name)`).eq('client_id', user.id).order('created_at', { ascending: false })
        setInquiries(inqData as any || [])

        const { data: memData } = await supabase.from('business_clients').select(`status, businesses (name, slug, logo_url)`).eq('user_id', user.id)
        setMemberships(memData as any || [])

      } catch (error) {
        console.error("Dashboard error:", error)
      } finally {
        setLoading(false)
      }
    }
    getData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setIsSavingProfile(true)
    const { error } = await supabase.from('profiles').update({ full_name: editForm.full_name, phone: editForm.phone }).eq('id', profile.id)
    if (error) alert("שגיאה בשמירה")
    else {
      setProfile({ ...profile, ...editForm })
      setIsEditingProfile(false)
    }
    setIsSavingProfile(false)
  }

  // --- Avatar Upload Handler ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
        if (!e.target.files || e.target.files.length === 0 || !profile) return
        setUploadingAvatar(true)

        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${profile.id}_${Date.now()}.${fileExt}`

        // 1. Upload
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file)

        if (uploadError) throw uploadError

        // 2. Get URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)

        // 3. Update Profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', profile.id)

        if (updateError) throw updateError

        setProfile({ ...profile, avatar_url: publicUrl })
        alert("תמונת הפרופיל עודכנה בהצלחה!")

    } catch (error: any) {
        console.error('Error uploading avatar:', error)
        alert('שגיאה בהעלאת התמונה: ' + error.message)
    } finally {
        setUploadingAvatar(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new.length < 6) { alert("סיסמה חייבת להכיל לפחות 6 תווים"); return; }
    if (passwordForm.new !== passwordForm.confirm) { alert("הסיסמאות אינן תואמות"); return; }
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new })
    if (error) alert("שגיאה: " + error.message)
    else { alert("הסיסמה שונתה בהצלחה!"); setPasswordForm({ new: '', confirm: '' }); }
    setPasswordLoading(false)
  }

  const getImageUrl = (path: string, bucket: string) => {
    if (path.startsWith('http')) return path
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const openImages = (paths: string[], bucket: string) => {
    const urls = paths.map(p => getImageUrl(p, bucket))
    setViewingImages(urls)
    setIsImageModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">ממתין לאישור</Badge>
      case 'CONFIRMED': return <Badge className="bg-green-600">מאושר</Badge>
      case 'REJECTED': return <Badge variant="destructive">נדחה</Badge>
      case 'COMPLETED': return <Badge variant="secondary">הושלם</Badge>
      case 'CANCELLED': return <Badge variant="outline" className="text-red-500 border-red-200">בוטל</Badge>
      case 'NEW': return <Badge className="bg-blue-500">חדש</Badge>
      case 'READ': return <Badge variant="secondary">בטיפול</Badge>
      case 'ARCHIVED': return <Badge variant="outline">נסגר</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>

  return (
    <div className="min-h-screen bg-slate-50 text-right" dir="rtl">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut size={18} /></Button>
            {/* AVATAR IN HEADER */}
            <Avatar>
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>{profile?.full_name?.[0] || <User size={18} />}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-slate-600 hidden md:block">שלום, {profile?.full_name || 'אורח'}</span>
          </div>
          <div className="font-bold text-xl text-slate-800">AvraSystem<span className="text-blue-600">.</span></div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="appointments" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-8 ml-auto">
            <TabsTrigger value="appointments">התורים שלי</TabsTrigger>
            <TabsTrigger value="inquiries">הייעוצים שלי</TabsTrigger>
            <TabsTrigger value="businesses">העסקים שלי</TabsTrigger>
            <TabsTrigger value="profile">פרופיל אישי</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-800">התורים שלי</h2>
              <Button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-2"><Search className="w-4 h-4" /> קבע תור חדש</Button>
            </div>
            {appointments.length === 0 ? <Card className="border-dashed border-2 bg-slate-50/50"><CardContent className="py-16 text-center text-slate-500">אין תורים להצגה</CardContent></Card> :
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {appointments.map((app) => (
                  <Card key={app.id} className="overflow-hidden border-slate-200 text-right hover:shadow-md transition-all">
                    <div className={`h-1.5 w-full ${app.status === 'CONFIRMED' ? 'bg-green-500' : app.status === 'CANCELLED' ? 'bg-red-500' : 'bg-orange-400'}`} />
                    <CardHeader className="pb-3 pt-4"><div className="flex justify-between items-start"><div className="text-right"><CardTitle className="text-lg font-bold">{app.services?.name}</CardTitle><CardDescription>{app.businesses?.name}</CardDescription></div>{getStatusBadge(app.status)}</div></CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded"><Calendar size={16} className="text-slate-400"/> {format(new Date(app.start_time), "d/MM/yy HH:mm")}</div>
                        {app.image_urls && app.image_urls.length > 0 && <Button variant="ghost" size="sm" className="p-0 h-auto text-xs" onClick={() => openImages(app.image_urls!, 'appointments')}><ImageIcon size={14}/> צפה בתמונות</Button>}
                        {app.business_public_notes && <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2 text-blue-700 bg-blue-50 p-3 rounded text-xs"><MessageSquare size={14} className="shrink-0 mt-0.5"/><div><span className="font-bold block mb-1">הערה מהעסק:</span>{app.business_public_notes}</div></div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          </TabsContent>

          <TabsContent value="inquiries" className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-right">היסטוריית ייעוצים</h2>
            {inquiries.length === 0 ? <Card><CardContent className="py-12 text-center text-slate-500">טרם שלחת פניות.</CardContent></Card> :
              <div className="grid gap-4 md:grid-cols-2">
                {inquiries.map((inq) => (
                  <Card key={inq.id} className="text-right hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><div className="flex justify-between items-start"><div><CardTitle className="text-base font-bold">{inq.businesses?.name}</CardTitle><CardDescription className="text-xs">{format(new Date(inq.created_at), "d/MM/yy HH:mm")}</CardDescription></div>{getStatusBadge(inq.status)}</div></CardHeader>
                    <CardContent>
                      <div className="bg-slate-50 p-3 rounded border text-sm text-slate-700">
                        <div className="font-semibold mb-1">{inq.subject}</div>
                        <p className="mb-2">{inq.message}</p>
                        {inq.image_urls && inq.image_urls.length > 0 && <Button variant="ghost" size="sm" className="p-0 h-auto text-xs mb-2" onClick={() => openImages(inq.image_urls!, 'inquiries')}><ImageIcon size={14}/> קבצים מצורפים</Button>}
                        {inq.reply && <div className="mt-3 pt-3 border-t text-green-800 bg-green-50 p-2 rounded"><strong>תשובת העסק:</strong> {inq.reply}</div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          </TabsContent>

          <TabsContent value="businesses">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-right">העסקים שלי</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {memberships.map((mem, idx) => (
                <Card key={idx} className="text-right"><CardHeader className="flex flex-row items-center gap-4 pb-2"><div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center border">{mem.businesses.logo_url ? <img src={mem.businesses.logo_url} className="w-full h-full object-cover rounded-full"/> : <Building size={20}/>}</div><div><CardTitle className="text-base">{mem.businesses.name}</CardTitle><Badge variant="secondary" className="mt-1 text-xs">{mem.status === 'APPROVED' ? 'פעיל' : 'ממתין'}</Badge></div></CardHeader><CardContent><Button variant="outline" className="w-full mt-2" onClick={() => router.push(`/book/${mem.businesses.slug}`)}>קבע תור חדש</Button></CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="text-right">
              <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>הפרופיל שלי</CardTitle></div>{!isEditingProfile ? <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}><Edit2 size={14} className="ml-2"/> ערוך</Button> : <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(false)}><X size={14}/></Button><Button size="sm" onClick={handleSaveProfile} disabled={isSavingProfile} className="bg-blue-600"><Save size={14} className="ml-2"/> שמור</Button></div>}</CardHeader>
              <CardContent className="space-y-6">
                
                {/* AVATAR UPLOAD SECTION */}
                <div className="flex flex-col items-center sm:flex-row gap-6 p-4 border rounded-lg bg-slate-50">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-white relative group">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="text-slate-300" size={32} />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <label htmlFor="avatar-upload" className="cursor-pointer text-white text-xs font-medium flex flex-col items-center gap-1">
                                <Camera size={16} /> שנה
                            </label>
                        </div>
                    </div>
                    <div className="flex-1 space-y-2 text-right">
                        <Label>תמונת פרופיל</Label>
                        <p className="text-xs text-slate-500">תמונה זו תופיע לעסקים שאליהם נרשמת.</p>
                        <div className="flex items-center gap-2">
                             <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                             <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()} disabled={uploadingAvatar}>
                                 {uploadingAvatar ? <Loader2 className="animate-spin ml-2 h-4 w-4"/> : <Upload className="ml-2 h-4 w-4"/>} 
                                 העלה תמונה
                             </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>שם מלא</Label><Input value={isEditingProfile ? editForm.full_name : profile?.full_name || ''} disabled={!isEditingProfile} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="text-right"/></div>
                  <div className="space-y-2"><Label>טלפון</Label><Input value={isEditingProfile ? editForm.phone : profile?.phone || ''} disabled={!isEditingProfile} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="text-right"/></div>
                  <div className="space-y-2"><Label>אימייל</Label><Input defaultValue={profile?.email || ''} disabled className="bg-slate-100 text-right opacity-70 cursor-not-allowed" /></div>
                </div>
                
                {!isEditingProfile && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-100">
                     <AlertCircle size={16} />
                     <span>שינוי פרטים כאן יעדכן אוטומטית את הטפסים העתידיים שלך בכל העסקים.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6 border-red-100 text-right">
               <CardHeader><CardTitle className="text-right flex items-center gap-2 text-slate-800"><Lock size={20} className="text-red-500"/> אבטחה</CardTitle><CardDescription className="text-right">שינוי סיסמת כניסה למערכת</CardDescription></CardHeader>
               <CardContent className="space-y-4 max-w-md ml-auto">
                 <div className="space-y-2 text-right"><Label>סיסמה חדשה</Label><Input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})} className="text-right" /></div>
                 <div className="space-y-2 text-right"><Label>אימות סיסמה</Label><Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})} className="text-right" /></div>
                 <Button className="w-full bg-red-600 hover:bg-red-700 mt-2" onClick={handleChangePassword} disabled={passwordLoading}>
                    {passwordLoading ? <Loader2 className="animate-spin ml-2" /> : 'עדכן סיסמה'}
                 </Button>
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="sm:max-w-[600px] text-right" dir="rtl">
            <DialogHeader><DialogTitle className="text-right">קבצים מצורפים</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {viewingImages?.map((url, idx) => (
                <div key={idx} className="relative rounded border aspect-square">
                  <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                  <a href={url} target="_blank" className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">הגדל</a>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}