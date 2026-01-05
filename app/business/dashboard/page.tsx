'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, LayoutDashboard, Calendar, Users, Settings, LogOut, Store, Check, X, Clock, MapPin, FileText, HelpCircle, Archive, MailOpen, TrendingUp, UserPlus, CalendarCheck, RotateCcw, Reply, Send, ImageIcon, Eye, User, Ghost, CalendarPlus, AlertTriangle, Edit2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, addMinutes, parse, isBefore, isAfter, isWithinInterval } from "date-fns"
import { he } from "date-fns/locale"

// --- Types ---
type Appointment = {
  id: string
  start_time: string
  end_time: string
  status: string
  guest_name: string | null
  guest_phone: string | null
  client_notes: string | null
  business_public_notes: string | null
  business_private_notes: string | null
  price_snapshot: number | null
  image_urls: string[] | null
  client_id: string | null
  services: {
    id: string 
    name: string
    price: number
    duration_minutes: number
  } | null
  profiles: {
    full_name: string | null
    phone: string | null
    email: string | null
  } | null
}

type Inquiry = {
  id: string
  created_at: string
  guest_name: string | null
  guest_phone: string | null
  subject: string | null
  message: string | null
  reply: string | null
  status: string
  image_urls: string[] | null
  profiles: {
    full_name: string | null
    phone: string | null
    email: string | null
  } | null
}

type ClientOption = {
    id: string
    full_name: string
    phone: string | null
}

export default function BusinessDashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [services, setServices] = useState<any[]>([])
  const [clientsList, setClientsList] = useState<ClientOption[]>([]) 
  
  const [hours, setHours] = useState<any[]>([])
  const [breaks, setBreaks] = useState<any[]>([])
  const [vacations, setVacations] = useState<any[]>([])

  const [stats, setStats] = useState({ todayCount: 0, todayRevenue: 0, pendingCount: 0, newInquiries: 0 })

  // Modals
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [publicNote, setPublicNote] = useState('')
  const [privateNote, setPrivateNote] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const [isReplyOpen, setIsReplyOpen] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const [viewingImages, setViewingImages] = useState<string[] | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' })
  
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false)
  const [manualBooking, setManualBooking] = useState({ 
      isRegistered: 'guest', 
      clientId: '', 
      name: '', 
      phone: '', 
      serviceId: '', 
      date: '', 
      time: '' 
  })
  const [manualBookingLoading, setManualBookingLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [calculatingSlots, setCalculatingSlots] = useState(false)
  const [bookingMessage, setBookingMessage] = useState<string | null>(null)

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/business/login'); return }

      const { data: biz, error } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single()
      if (error || !biz) { alert("לא נמצא עסק בבעלותך."); router.push('/'); return }
      setBusiness(biz)

      const { data: appData } = await supabase.from('appointments').select(`*, services (id, name, price, duration_minutes), profiles (full_name, phone, email)`).eq('business_id', biz.id).order('start_time', { ascending: false })
      setAppointments(appData as any || [])

      const { data: inqData } = await supabase.from('inquiries').select(`*, profiles (full_name, phone, email)`).eq('business_id', biz.id).order('created_at', { ascending: false })
      setInquiries(inqData as any || [])

      const { data: srvData } = await supabase.from('services').select('*').eq('business_id', biz.id).eq('is_active', true)
      setServices(srvData || [])

      const { data: clientsData } = await supabase.from('business_clients')
        .select(`user_id, profiles:user_id(full_name, phone)`)
        .eq('business_id', biz.id)
        .eq('status', 'APPROVED')
      
      const mappedClients = clientsData?.map((c: any) => ({
          id: c.user_id,
          full_name: c.profiles?.full_name || 'ללא שם',
          phone: c.profiles?.phone
      })) || []
      setClientsList(mappedClients)

      const { data: h } = await supabase.from('business_hours').select('*').eq('business_id', biz.id)
      setHours(h || [])
      const { data: b } = await supabase.from('business_breaks').select('*').eq('business_id', biz.id)
      setBreaks(b || [])
      const { data: v } = await supabase.from('business_vacations').select('*').eq('business_id', biz.id)
      setVacations(v || [])

      const today = new Date().toDateString()
      const todayApps = (appData as any)?.filter((a: any) => new Date(a.start_time).toDateString() === today && a.status !== 'CANCELLED' && a.status !== 'REJECTED') || []
      const pendingApps = (appData as any)?.filter((a: any) => a.status === 'PENDING') || []
      const newInqs = (inqData as any)?.filter((i: any) => i.status === 'NEW') || []
      const revenue = todayApps.reduce((acc: number, curr: any) => acc + (curr.services?.price || 0), 0)

      setStats({ todayCount: todayApps.length, todayRevenue: revenue, pendingCount: pendingApps.length, newInquiries: newInqs.length })
      setLoading(false)
    }
    initData()
  }, [])

  // --- Availability Logic ---
  const calculateAvailability = (targetDate: string, serviceId: string | undefined, currentApptId?: string) => {
      if (!targetDate || !serviceId) return { slots: [], message: null }

      const dateObj = new Date(targetDate)
      const dayOfWeek = dateObj.getDay()
      const selectedDateStr = format(dateObj, 'yyyy-MM-dd')

      const activeVacation = vacations.find(v => selectedDateStr >= v.start_date && selectedDateStr <= v.end_date)
      if (activeVacation) return { slots: [], message: `העסק בחופשה: ${activeVacation.reason}` }

      const hoursData = hours.find(h => h.day_of_week === dayOfWeek)
      if (!hoursData) return { slots: [], message: "העסק סגור ביום זה" }

      const service = services.find(s => s.id === serviceId)
      const duration = service?.duration_minutes || 30
      const dayBreaks = breaks.filter(b => b.day_of_week === dayOfWeek)
      
      const parseTimeSafe = (timeStr: string) => parse(timeStr.slice(0, 5), 'HH:mm', dateObj)
      let currentTime = parseTimeSafe(hoursData.start_time)
      const endTime = parseTimeSafe(hoursData.end_time)
      
      const dayStart = new Date(dateObj.setHours(0,0,0,0))
      const dayEnd = new Date(dateObj.setHours(23,59,59,999))
      
      const dayApps = appointments.filter(a => {
        if (a.id === currentApptId) return false // Ignore current appointment if rescheduling
        const appStart = new Date(a.start_time)
        return appStart >= dayStart && appStart <= dayEnd && a.status !== 'CANCELLED' && a.status !== 'REJECTED'
      })

      const slots: string[] = []
      const intervalStep = 15

      while (isBefore(currentTime, endTime)) {
        const slotStart = currentTime
        const slotEnd = addMinutes(currentTime, duration)
        if (isAfter(slotEnd, endTime)) break;
        
        if (dateObj.toDateString() === new Date().toDateString() && isBefore(slotStart, new Date())) {
            currentTime = addMinutes(currentTime, intervalStep)
            continue
        }

        let inBreak = false
        for (const brk of dayBreaks) {
          const bStart = parseTimeSafe(brk.start_time); const bEnd = parseTimeSafe(brk.end_time)
          if (isBefore(slotStart, bEnd) && isAfter(slotEnd, bStart)) { inBreak = true; break; }
        }
        if (inBreak) { currentTime = addMinutes(currentTime, intervalStep); continue; }

        let isBooked = false
        for (const app of dayApps) {
          const appStart = new Date(app.start_time); const appEnd = new Date(app.end_time)
          if (isBefore(slotStart, appEnd) && isAfter(slotEnd, appStart)) { isBooked = true; break; }
        }
        if (isBooked) { currentTime = addMinutes(currentTime, intervalStep); continue; }

        slots.push(format(slotStart, 'HH:mm'))
        currentTime = addMinutes(currentTime, intervalStep)
      }

      return { slots, message: slots.length === 0 ? "אין תורים פנויים" : null }
  }

  useEffect(() => {
    if (!isManualBookingOpen) return
    setCalculatingSlots(true)
    const { slots, message } = calculateAvailability(manualBooking.date, manualBooking.serviceId)
    setAvailableSlots(slots)
    setBookingMessage(message)
    setCalculatingSlots(false)
  }, [manualBooking.date, manualBooking.serviceId, isManualBookingOpen])

  useEffect(() => {
    if (!isRescheduleOpen || !selectedAppt) return
    setCalculatingSlots(true)
    const { slots, message } = calculateAvailability(rescheduleData.date, selectedAppt.services?.id || '', selectedAppt.id)
    setAvailableSlots(slots)
    setBookingMessage(message)
    setCalculatingSlots(false)
  }, [rescheduleData.date, isRescheduleOpen])


  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/business/login') }
  const getImageUrl = (path: string, bucket: string) => path.startsWith('http') ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  const openImages = (paths: string[], bucket: string) => { setViewingImages(paths.map(p => getImageUrl(p, bucket))); setIsImageModalOpen(true) }

  // --- Updates ---
  const updateAppStatus = async (id: string, newStatus: string) => {
    setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app))
    await supabase.from('appointments').update({ status: newStatus }).eq('id', id)
  }

  const restoreApp = async (id: string) => {
    updateAppStatus(id, 'PENDING')
    alert("התור שוחזר לסטטוס 'ממתין'.")
  }

  const openStatusModal = (app: Appointment) => {
    setSelectedAppt(app)
    setNewStatus(app.status)
    setIsStatusModalOpen(true)
  }

  const saveStatusChange = async () => {
    if (!selectedAppt) return
    updateAppStatus(selectedAppt.id, newStatus)
    setIsStatusModalOpen(false)
  }

  const updateInquiryStatus = async (id: string, newStatus: string) => {
    setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq))
    await supabase.from('inquiries').update({ status: newStatus }).eq('id', id)
    if (newStatus !== 'NEW') setStats(prev => ({ ...prev, newInquiries: Math.max(0, prev.newInquiries - 1) }))
  }

  // --- Reschedule ---
  const openReschedule = (app: Appointment) => {
    setSelectedAppt(app)
    setRescheduleData({ date: format(new Date(app.start_time), 'yyyy-MM-dd'), time: '' })
    setIsRescheduleOpen(true)
  }

  const handleRescheduleSubmit = async () => {
    if (!selectedAppt || !rescheduleData.date || !rescheduleData.time) return
    const newStart = new Date(`${rescheduleData.date}T${rescheduleData.time}`)
    const duration = selectedAppt.services?.duration_minutes || 30
    const newEnd = new Date(newStart.getTime() + duration * 60000)

    const { error } = await supabase.from('appointments').update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString()
    }).eq('id', selectedAppt.id)

    if (!error) {
        setAppointments(prev => prev.map(app => app.id === selectedAppt.id ? { ...app, start_time: newStart.toISOString(), end_time: newEnd.toISOString() } : app))
        alert("התור הוזז בהצלחה")
        setIsRescheduleOpen(false)
    } else {
        alert("שגיאה בהזזת התור")
    }
  }

  // --- Manual Booking ---
  const handleManualBooking = async () => {
    if (!manualBooking.serviceId || !manualBooking.date || !manualBooking.time) { alert("חובה למלא פרטי תור"); return }
    if (manualBooking.isRegistered === 'guest' && (!manualBooking.name || !manualBooking.phone)) { alert("חובה להזין שם וטלפון לאורח"); return }
    if (manualBooking.isRegistered === 'registered' && !manualBooking.clientId) { alert("חובה לבחור לקוח מהרשימה"); return }

    setManualBookingLoading(true)
    
    const service = services.find(s => s.id === manualBooking.serviceId)
    const start = new Date(`${manualBooking.date}T${manualBooking.time}`)
    const end = new Date(start.getTime() + (service?.duration_minutes || 30) * 60000)

    let guestName = manualBooking.name
    let guestPhone = manualBooking.phone
    let clientId = null

    if (manualBooking.isRegistered === 'registered') {
        const client = clientsList.find(c => c.id === manualBooking.clientId)
        if (client) {
            clientId = client.id
            guestName = client.full_name
            guestPhone = client.phone || ''
        }
    }

    const { data, error } = await supabase.from('appointments').insert({
        business_id: business.id,
        service_id: manualBooking.serviceId,
        client_id: clientId,
        guest_name: guestName,
        guest_phone: guestPhone,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'CONFIRMED' 
    }).select(`*, services (name, price, duration_minutes), profiles (full_name, phone, email)`).single()

    if (!error && data) {
        setAppointments(prev => [data, ...prev])
        alert("התור נקבע בהצלחה")
        setIsManualBookingOpen(false)
        setManualBooking({ isRegistered: 'guest', clientId: '', name: '', phone: '', serviceId: '', date: '', time: '' })
    } else {
        alert("שגיאה ביצירת התור")
    }
    setManualBookingLoading(false)
  }

  const openNotesModal = (app: Appointment) => { setSelectedAppt(app); setPublicNote(app.business_public_notes || ''); setPrivateNote(app.business_private_notes || ''); setIsNotesOpen(true) }
  const saveNotes = async () => { if (!selectedAppt) return; setSavingNotes(true); const { error } = await supabase.from('appointments').update({ business_public_notes: publicNote, business_private_notes: privateNote }).eq('id', selectedAppt.id); if (!error) { setAppointments(prev => prev.map(app => app.id === selectedAppt.id ? { ...app, business_public_notes: publicNote, business_private_notes: privateNote } : app)); setIsNotesOpen(false) } else { alert("שגיאה") } setSavingNotes(false) }
  
  const openReplyModal = (inq: Inquiry) => { setSelectedInquiry(inq); setReplyText(inq.reply || ''); setIsReplyOpen(true) }
  const saveReply = async () => { if (!selectedInquiry) return; setSendingReply(true); const { error } = await supabase.from('inquiries').update({ reply: replyText }).eq('id', selectedInquiry.id); if (!error) { setInquiries(prev => prev.map(i => i.id === selectedInquiry.id ? { ...i, reply: replyText } : i)); if(selectedInquiry.status === 'NEW') updateInquiryStatus(selectedInquiry.id, 'READ'); setIsReplyOpen(false) } else { alert("שגיאה") } setSendingReply(false) }

  const getStatusBadge = (status: string) => { switch (status) { case 'PENDING': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">ממתין</Badge>; case 'CONFIRMED': return <Badge className="bg-green-600">מאושר</Badge>; case 'REJECTED': return <Badge variant="destructive">נדחה</Badge>; case 'COMPLETED': return <Badge variant="secondary" className="bg-slate-200 text-slate-700">הושלם</Badge>; case 'CANCELLED': return <Badge variant="outline" className="text-red-500 border-red-200">בוטל</Badge>; case 'NEW': return <Badge className="bg-blue-500">חדש</Badge>; case 'READ': return <Badge variant="outline">נקרא</Badge>; case 'ARCHIVED': return <Badge variant="outline">בארכיון</Badge>; default: return <Badge variant="outline">{status}</Badge> } }
  const getClientName = (item: any) => item.profiles?.full_name || item.guest_name || 'לקוח לא מזוהה'
  const getClientPhone = (item: any) => item.profiles?.phone || item.guest_phone || '-'

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" /></div>

  const activeApps = appointments.filter(a => ['PENDING', 'CONFIRMED'].includes(a.status))
  const historyApps = appointments.filter(a => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(a.status))
  const activeInquiries = inquiries.filter(i => i.status !== 'ARCHIVED');
  const archivedInquiries = inquiries.filter(i => i.status === 'ARCHIVED');

  return (
    <div className="min-h-screen bg-slate-100 flex" dir="rtl">
      
      <aside className="w-64 bg-[#0f172a] text-white flex-shrink-0 hidden md:flex flex-col sticky top-0 h-screen shadow-xl z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Store size={20} className="text-white" /></div><div><div className="font-bold text-lg">AvraSystem</div><div className="text-xs text-slate-400">ניהול עסק</div></div></div>
        <nav className="flex-1 p-4 space-y-2"><Button variant="secondary" className="w-full justify-start gap-3 bg-blue-600/10 text-blue-400 border border-blue-600/20" onClick={() => router.push('/business/dashboard')}><LayoutDashboard size={20} /> לוח בקרה</Button><Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white" onClick={() => router.push('/business/clients')}><Users size={20} /> לקוחות</Button><Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white" onClick={() => router.push('/business/settings')}><Settings size={20} /> הגדרות</Button></nav>
        <div className="p-4 border-t border-slate-800"><Button variant="destructive" className="w-full gap-2 bg-red-500/10 text-red-400 border-red-500/20" onClick={handleLogout}><LogOut size={16} /> התנתק</Button></div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        <header className="h-20 bg-white border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-10 backdrop-blur-sm bg-white/80">
          <div><h1 className="text-2xl font-bold text-slate-800">{business.name}</h1><p className="text-sm text-slate-500">ברוך הבא</p></div>
          <div className="flex gap-4">
             <Button onClick={() => setIsManualBookingOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm"><CalendarPlus className="ml-2 h-4 w-4"/> תור יזום</Button>
             <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200">{business.name[0]}</div>
          </div>
        </header>

        <main className="p-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <Card className="border-none shadow-md"><CardContent className="p-6 flex flex-col"><span className="text-slate-500 text-sm">היום</span><span className="text-3xl font-bold text-slate-800">{stats.todayCount}</span></CardContent></Card>
            <Card className="border-none shadow-md"><CardContent className="p-6 flex flex-col"><span className="text-slate-500 text-sm">הכנסה</span><span className="text-3xl font-bold text-emerald-600">₪{stats.todayRevenue}</span></CardContent></Card>
            <Card className="border-none shadow-md"><CardContent className="p-6 flex flex-col"><span className="text-slate-500 text-sm">ממתינים</span><span className="text-3xl font-bold text-orange-600">{stats.pendingCount}</span></CardContent></Card>
            <Card className="border-none shadow-md"><CardContent className="p-6 flex flex-col"><span className="text-slate-500 text-sm">פניות</span><span className="text-3xl font-bold text-purple-600">{stats.newInquiries}</span></CardContent></Card>
          </div>

          <Tabs defaultValue="active_apps" className="w-full" dir="rtl">
            <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm h-12">
                    <TabsTrigger value="active_apps" className="rounded-lg px-6 h-10">תורים פעילים</TabsTrigger>
                    <TabsTrigger value="history_apps" className="rounded-lg px-6 h-10">היסטוריית תורים</TabsTrigger>
                    <TabsTrigger value="inquiries" className="rounded-lg px-6 h-10">פניות וייעוץ</TabsTrigger>
                    <TabsTrigger value="archive" className="rounded-lg px-6 h-10">ארכיון פניות</TabsTrigger>
                </TabsList>
            </div>

            {/* Active Appointments */}
            <TabsContent value="active_apps">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50/50 text-slate-500 font-medium border-b"><tr><th className="p-5 w-[20%]">לקוח</th><th className="p-5 w-[20%]">שירות</th><th className="p-5 w-[15%]">מועד</th><th className="p-5 w-[15%]">סטטוס</th><th className="p-5 w-[30%] text-center">פעולות</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                        {activeApps.map((app) => (
                            <tr key={app.id} className="hover:bg-slate-50/50">
                                <td className="p-5 font-medium">
                                    <div className="flex items-center gap-2 mb-1">
                                        {app.client_id ? 
                                            <span title="לקוח רשום" className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[10px]"><User size={12}/> רשום</span> : 
                                            <span title="אורח" className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]"><Ghost size={12}/> אורח</span>
                                        }
                                    </div>
                                    <div className="text-base font-bold text-slate-800">{getClientName(app)}</div>
                                    <div className="text-xs text-slate-500">{getClientPhone(app)}</div>
                                    {app.business_public_notes && <div className="mt-2 text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-100"><strong>הערה ללקוח:</strong> {app.business_public_notes}</div>}
                                    {app.business_private_notes && <div className="mt-1 text-xs bg-purple-50 text-purple-800 p-2 rounded border border-purple-100"><strong>הערה פרטית:</strong> {app.business_private_notes}</div>}
                                </td>
                                <td className="p-5"><div>{app.services?.name}</div></td>
                                <td className="p-5">{format(new Date(app.start_time), "d/MM HH:mm")}</td>
                                <td className="p-5 flex items-center gap-2">
                                    {getStatusBadge(app.status)}
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openStatusModal(app)} title="ערוך סטטוס"><Edit2 size={12} /></Button>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center justify-end gap-3">
                                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openNotesModal(app)} title="הערות"><FileText size={14}/></Button>
                                        
                                        {/* תצוגה מקדימה לתמונה */}
                                        {app.image_urls && app.image_urls.length > 0 && (
                                            <div className="relative w-8 h-8 rounded overflow-hidden border cursor-pointer group" onClick={() => openImages(app.image_urls!, 'appointments')} title="צפה בתמונות">
                                                <img src={getImageUrl(app.image_urls[0], 'appointments')} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                                {app.image_urls.length > 1 && <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-[8px] px-1 rounded-tl-sm">+{app.image_urls.length-1}</div>}
                                            </div>
                                        )}

                                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openReschedule(app)} title="הזז תור"><Clock size={14}/></Button>
                                        {app.status === 'PENDING' && <><Button size="sm" className="bg-green-600 h-8 w-8 p-0 rounded-full" onClick={() => updateAppStatus(app.id, 'CONFIRMED')} title="אשר"><Check size={16}/></Button><Button size="sm" variant="destructive" className="h-8 w-8 p-0 rounded-full" onClick={() => updateAppStatus(app.id, 'REJECTED')} title="דחה"><X size={16}/></Button></>}
                                        {app.status === 'CONFIRMED' && <Button size="sm" variant="outline" className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50" onClick={() => updateAppStatus(app.id, 'COMPLETED')}>סיים</Button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </TabsContent>

            {/* History Appointments */}
            <TabsContent value="history_apps">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50/50 text-slate-500 font-medium border-b"><tr><th className="p-5">לקוח</th><th className="p-5">שירות</th><th className="p-5">מועד</th><th className="p-5">סטטוס</th><th className="p-5 text-center">פעולות</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                        {historyApps.map((app) => (
                            <tr key={app.id} className="opacity-80 hover:opacity-100">
                                <td className="p-5 font-medium"><div>{getClientName(app)}</div></td>
                                <td className="p-5">{app.services?.name}</td>
                                <td className="p-5">{format(new Date(app.start_time), "d/MM/yy HH:mm")}</td>
                                <td className="p-5">{getStatusBadge(app.status)}</td>
                                <td className="p-5 text-center">
                                    <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => restoreApp(app.id)} title="שחזר ללוח">
                                        <RotateCcw size={14} /> שחזר
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </TabsContent>

            {/* Inquiries */}
            <TabsContent value="inquiries">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                        <tr><th className="p-5">מאת</th><th className="p-5">נושא</th><th className="p-5">תאריך</th><th className="p-5">סטטוס</th><th className="p-5 text-center">פעולות</th></tr>
                        </thead>
                        <tbody>{activeInquiries.map(inq => (<tr key={inq.id} className="hover:bg-slate-50/50"><td className="p-5 font-medium"><div>{getClientName(inq)}</div><div className="text-xs text-slate-500">{getClientPhone(inq)}</div></td><td className="p-5"><div className="font-bold mb-1">{inq.subject}</div><div className="text-xs text-slate-600 line-clamp-2">{inq.message}</div>
                        {inq.image_urls && inq.image_urls.length > 0 && (
                            <div className="relative w-8 h-8 rounded overflow-hidden border cursor-pointer mt-2 group" onClick={() => openImages(inq.image_urls!, 'inquiries')}>
                                <img src={getImageUrl(inq.image_urls[0], 'inquiries')} className="w-full h-full object-cover" />
                                {inq.image_urls.length > 1 && <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-[8px] px-1 rounded-tl-sm">+{inq.image_urls.length-1}</div>}
                            </div>
                        )}
                        {inq.reply && <div className="mt-2 text-xs text-green-700 bg-green-50 p-1 rounded border border-green-100"><strong>השבת:</strong> {inq.reply}</div>}
                        </td><td className="p-5 text-xs">{format(new Date(inq.created_at), "d/MM HH:mm")}</td><td className="p-5">{getStatusBadge(inq.status)}</td><td className="p-5"><div className="flex justify-end gap-3"><Button size="sm" variant="outline" className="h-8 w-8 p-0 text-blue-600 border-blue-200" onClick={() => openReplyModal(inq)}><Reply size={14}/></Button><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600" onClick={() => updateInquiryStatus(inq.id, 'ARCHIVED')}><Archive size={14}/></Button></div></td></tr>))}</tbody>
                    </table>
                </div>
            </TabsContent>
            
            {/* Archive */}
            <TabsContent value="archive">
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50/50 text-slate-500 font-medium border-b"><tr><th className="p-5">מאת</th><th className="p-5">נושא</th><th className="p-5">סטטוס</th><th className="p-5 text-center">פעולות</th></tr></thead>
                        <tbody>{archivedInquiries.map(inq => (<tr key={inq.id} className="opacity-70 hover:opacity-100"><td className="p-5">{getClientName(inq)}</td><td className="p-5">{inq.message}</td><td className="p-5">{getStatusBadge(inq.status)}</td><td className="p-5 text-center"><Button size="sm" variant="ghost" onClick={() => updateInquiryStatus(inq.id, 'READ')} title="שחזר"><RotateCcw size={14} /></Button></td></tr>))}</tbody>
                    </table>
                </div>
            </TabsContent>
          </Tabs>
        </main>

        <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}><DialogContent className="text-right" dir="rtl"><DialogHeader><DialogTitle>הערות</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="space-y-2"><Label>ציבורי (ללקוח)</Label><Textarea value={publicNote} onChange={e=>setPublicNote(e.target.value)}/></div><div className="space-y-2"><Label>פרטי (לעסק)</Label><Textarea value={privateNote} onChange={e=>setPrivateNote(e.target.value)}/></div></div><DialogFooter><Button onClick={saveNotes}>שמור</Button></DialogFooter></DialogContent></Dialog>
        
        <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}><DialogContent className="text-right" dir="rtl"><DialogHeader><DialogTitle>הזזת תור</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="space-y-2"><Label>תאריך חדש</Label><Input type="date" value={rescheduleData.date} onChange={e=>setRescheduleData({...rescheduleData, date: e.target.value})}/></div><div className="space-y-2"><Label>שעה (לחץ לבחירה)</Label>{calculatingSlots ? <div className="text-sm flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> מחשב זמינות...</div> : bookingMessage ? <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{bookingMessage}</div> : <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1 border rounded">{availableSlots.map(time => (<button key={time} onClick={() => setRescheduleData({...rescheduleData, time})} className={`text-xs p-1 rounded border ${rescheduleData.time === time ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}>{time}</button>))}</div>}</div></div><DialogFooter><Button onClick={handleRescheduleSubmit} disabled={!rescheduleData.time}>עדכן מועד</Button></DialogFooter></DialogContent></Dialog>

        <Dialog open={isManualBookingOpen} onOpenChange={setIsManualBookingOpen}>
            <DialogContent className="text-right sm:max-w-[450px]" dir="rtl">
                <DialogHeader><DialogTitle>קביעת תור יזום</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
                        <Label className="mb-2 block">סוג לקוח</Label>
                        <div className="flex gap-2">
                            <Button variant={manualBooking.isRegistered === 'guest' ? 'default' : 'outline'} size="sm" onClick={() => setManualBooking({...manualBooking, isRegistered: 'guest'})} className="flex-1"><Ghost size={14} className="ml-2"/> אורח מזדמן</Button>
                            <Button variant={manualBooking.isRegistered === 'registered' ? 'default' : 'outline'} size="sm" onClick={() => setManualBooking({...manualBooking, isRegistered: 'registered'})} className="flex-1"><User size={14} className="ml-2"/> לקוח רשום</Button>
                        </div>
                    </div>
                    {manualBooking.isRegistered === 'guest' ? (<><div className="space-y-2"><Label>שם הלקוח</Label><Input value={manualBooking.name} onChange={e=>setManualBooking({...manualBooking, name: e.target.value})}/></div><div className="space-y-2"><Label>טלפון</Label><Input value={manualBooking.phone} onChange={e=>setManualBooking({...manualBooking, phone: e.target.value})}/></div></>) : (<div className="space-y-2"><Label>בחר לקוח מהרשימה</Label><Select onValueChange={(val) => setManualBooking({...manualBooking, clientId: val})} dir="rtl"><SelectTrigger><SelectValue placeholder="חפש לקוח..." /></SelectTrigger><SelectContent>{clientsList.length > 0 ? clientsList.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} - {c.phone}</SelectItem>) : <div className="p-2 text-sm text-slate-500 text-center">אין לקוחות רשומים</div>}</SelectContent></Select></div>)}
                    <div className="space-y-2"><Label>שירות</Label><select className="w-full border p-2 rounded" value={manualBooking.serviceId} onChange={e=>setManualBooking({...manualBooking, serviceId: e.target.value})}>{services.map(s=><option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} דק')</option>)}</select></div>
                    <div className="space-y-2"><Label>תאריך</Label><Input type="date" value={manualBooking.date} onChange={e=>setManualBooking({...manualBooking, date: e.target.value})}/></div>
                    <div className="space-y-2"><Label>שעה (לחץ לבחירה)</Label>{!manualBooking.date || !manualBooking.serviceId ? <div className="text-sm text-slate-400 p-2 bg-slate-50 rounded">יש לבחור שירות ותאריך תחילה</div> : calculatingSlots ? <div className="flex items-center gap-2 text-sm"><Loader2 className="animate-spin w-4 h-4"/> מחשב זמינות...</div> : bookingMessage ? <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{bookingMessage}</div> : <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1 border rounded">{availableSlots.map(time => (<button key={time} onClick={() => setManualBooking({...manualBooking, time})} className={`text-xs p-1 rounded border ${manualBooking.time === time ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}>{time}</button>))}</div>}</div>
                </div>
                <DialogFooter><Button onClick={handleManualBooking} disabled={manualBookingLoading || !manualBooking.time}>{manualBookingLoading ? <Loader2 className="animate-spin" /> : 'צור תור'}</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isReplyOpen} onOpenChange={setIsReplyOpen}><DialogContent className="text-right" dir="rtl"><DialogHeader><DialogTitle>תשובה ללקוח</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="bg-slate-50 p-3 rounded border text-sm">{selectedInquiry?.message}</div><div className="space-y-2"><Label>תשובה</Label><Textarea value={replyText} onChange={e=>setReplyText(e.target.value)} className="min-h-[120px]"/></div></div><DialogFooter><Button onClick={saveReply} disabled={sendingReply}>{sendingReply ? <Loader2 className="animate-spin" /> : 'שלח תשובה'}</Button></DialogFooter></DialogContent></Dialog>

        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}><DialogContent className="sm:max-w-[600px] text-right" dir="rtl"><DialogHeader><DialogTitle>תמונות</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4 py-4">{viewingImages?.map((url, idx) => (<div key={idx} className="relative rounded border aspect-square"><img src={url} alt="Attachment" className="w-full h-full object-cover" /><a href={url} target="_blank" className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">הגדל</a></div>))}</div></DialogContent></Dialog>

        {/* Status Edit Modal */}
        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
            <DialogContent className="text-right sm:max-w-[300px]" dir="rtl">
                <DialogHeader><DialogTitle>שינוי סטטוס</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                    <Label>בחר סטטוס חדש:</Label>
                    <Select onValueChange={setNewStatus} defaultValue={newStatus} dir="rtl">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PENDING">ממתין לאישור</SelectItem>
                            <SelectItem value="CONFIRMED">מאושר</SelectItem>
                            <SelectItem value="REJECTED">נדחה</SelectItem>
                            <SelectItem value="CANCELLED">בוטל</SelectItem>
                            <SelectItem value="COMPLETED">הושלם</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter><Button onClick={saveStatusChange}>שמור שינוי</Button></DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}