'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, Save, Store, List, FileQuestion, ArrowRight, Clock, Pencil, X, Check, Coffee, CalendarOff, Lock, Upload, ImageIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

const DAYS = [
  { id: 0, label: 'ראשון' },
  { id: 1, label: 'שני' },
  { id: 2, label: 'שלישי' },
  { id: 3, label: 'רביעי' },
  { id: 4, label: 'חמישי' },
  { id: 5, label: 'שישי' },
  { id: 6, label: 'שבת' },
]

export default function BusinessSettings() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<any>(null)
  
  const [services, setServices] = useState<any[]>([])
  const [formFields, setFormFields] = useState<any[]>([])
  const [hours, setHours] = useState<any[]>([])
  const [breaks, setBreaks] = useState<any[]>([])
  const [vacations, setVacations] = useState<any[]>([])
  
  // Logo State
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [newVacation, setNewVacation] = useState({ start: '', end: '', reason: '' })
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [tempServiceData, setTempServiceData] = useState<any>(null)
  
  // Password Change
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/business/login')
        return
      }

      const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single()
      if (!biz) return
      setBusiness(biz)
      setLogoUrl(biz.logo_url)

      const { data: srv } = await supabase.from('services').select('*').eq('business_id', biz.id).order('created_at')
      setServices(srv || [])

      const { data: flds } = await supabase.from('form_fields').select('*').eq('business_id', biz.id).order('order_index')
      setFormFields(flds || [])

      const { data: hrs } = await supabase.from('business_hours').select('*').eq('business_id', biz.id)
      setHours(hrs || [])

      const { data: brks } = await supabase.from('business_breaks').select('*').eq('business_id', biz.id)
      setBreaks(brks || [])

      const { data: vacs } = await supabase.from('business_vacations').select('*').eq('business_id', biz.id).order('start_date')
      setVacations(vacs || [])

      setLoading(false)
    }
    fetchData()
  }, [])

  // --- Logo Handler ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      setUploadingLogo(true)

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${business.id}_${Date.now()}.${fileExt}` // Unique name

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(fileName)

      // 3. Update Business Record
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ logo_url: publicUrl })
        .eq('id', business.id)

      if (updateError) throw updateError

      setLogoUrl(publicUrl)
      // Update local business state to reflect change immediately if needed elsewhere
      setBusiness({ ...business, logo_url: publicUrl }) 
      alert('הלוגו עודכן בהצלחה!')

    } catch (error: any) {
      console.error('Error uploading logo:', error)
      alert('שגיאה בהעלאת הלוגו: ' + error.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  // --- Password Handler ---
  const handleChangePassword = async () => {
    if (passwordForm.new.length < 6) { alert("סיסמה חייבת להכיל לפחות 6 תווים"); return; }
    if (passwordForm.new !== passwordForm.confirm) { alert("הסיסמאות אינן תואמות"); return; }
    
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new })
    if (error) alert("שגיאה בשינוי הסיסמה: " + error.message)
    else { alert("הסיסמה שונתה בהצלחה!"); setPasswordForm({ new: '', confirm: '' }); }
    setPasswordLoading(false)
  }

  // --- Services Handlers ---
  const startEditingService = (service: any) => {
    setEditingServiceId(service.id)
    setTempServiceData({ ...service })
  }

  const cancelEditingService = () => {
    setEditingServiceId(null)
    setTempServiceData(null)
  }

  const saveService = async () => {
    if (!tempServiceData) return
    setServices(services.map(s => s.id === tempServiceData.id ? tempServiceData : s))
    setEditingServiceId(null)
    await supabase.from('services').update({ name: tempServiceData.name, duration_minutes: tempServiceData.duration_minutes, price: tempServiceData.price }).eq('id', tempServiceData.id)
  }

  const addService = async () => {
    // מחיר ברירת מחדל 0
    const newService = { business_id: business.id, name: 'טיפול חדש', duration_minutes: 30, price: 0, is_active: true }
    const { data } = await supabase.from('services').insert(newService).select().single()
    if (data) { setServices([...services, data]); startEditingService(data); }
  }

  const deleteService = async (id: string) => {
    if (!confirm('האם למחוק שירות זה?')) return
    setServices(services.filter(s => s.id !== id))
    await supabase.from('services').delete().eq('id', id)
  }

  // --- Form Fields Handlers ---
  const addField = async (type: 'INQUIRY' | 'BOOKING') => {
    const newField = { business_id: business.id, form_type: type, label: 'שאלה חדשה', field_type: 'TEXT', is_required: false, order_index: formFields.length + 1 }
    const { data } = await supabase.from('form_fields').insert(newField).select().single()
    if (data) setFormFields([...formFields, data])
  }

  const updateField = async (id: string, field: string, value: any) => {
    setFormFields(formFields.map(f => f.id === id ? { ...f, [field]: value } : f))
    await supabase.from('form_fields').update({ [field]: value }).eq('id', id)
  }

  const deleteField = async (id: string) => {
    setFormFields(formFields.filter(f => f.id !== id))
    await supabase.from('form_fields').delete().eq('id', id)
  }

  // --- Availability Handlers ---
  const toggleDay = async (dayId: number, currentStatus: boolean) => {
    const existing = hours.find(h => h.day_of_week === dayId)
    if (existing) {
      if (currentStatus) {
        setHours(hours.filter(h => h.day_of_week !== dayId))
        await supabase.from('business_hours').delete().eq('id', existing.id)
      }
    } else {
      const newHour = { business_id: business.id, day_of_week: dayId, start_time: '09:00', end_time: '18:00', is_active: true, type: 'FULL_DAY' }
      const { data } = await supabase.from('business_hours').insert(newHour).select().single()
      if (data) setHours([...hours, data])
    }
  }

  const updateHourTime = async (dayId: number, field: 'start_time' | 'end_time', value: string) => {
    const hourObj = hours.find(h => h.day_of_week === dayId)
    if (!hourObj) return
    const updated = { ...hourObj, [field]: value }
    setHours(hours.map(h => h.day_of_week === dayId ? updated : h))
    await supabase.from('business_hours').update({ [field]: value }).eq('id', hourObj.id)
  }

  const addBreak = async (dayId: number) => {
    const newBreak = { business_id: business.id, day_of_week: dayId, start_time: '13:00', end_time: '13:30' }
    const { data } = await supabase.from('business_breaks').insert(newBreak).select().single()
    if (data) setBreaks([...breaks, data])
  }

  const updateBreak = async (breakId: string, field: 'start_time' | 'end_time', value: string) => {
    setBreaks(breaks.map(b => b.id === breakId ? { ...b, [field]: value } : b))
    await supabase.from('business_breaks').update({ [field]: value }).eq('id', breakId)
  }

  const deleteBreak = async (breakId: string) => {
    setBreaks(breaks.filter(b => b.id !== breakId))
    await supabase.from('business_breaks').delete().eq('id', breakId)
  }

  // --- Vacation Handlers ---
  const addVacation = async () => {
    if (!newVacation.start || !newVacation.end) { alert("יש להזין תאריך התחלה וסיום"); return; }
    const vacationData = { business_id: business.id, start_date: newVacation.start, end_date: newVacation.end, reason: newVacation.reason || 'חופשה' }
    const { data, error } = await supabase.from('business_vacations').insert(vacationData).select().single()
    if (error) console.error(error)
    else if (data) { setVacations([...vacations, data]); setNewVacation({ start: '', end: '', reason: '' }); }
  }

  const deleteVacation = async (id: string) => {
    if (!confirm('למחוק חופשה זו?')) return
    setVacations(vacations.filter(v => v.id !== id))
    await supabase.from('business_vacations').delete().eq('id', id)
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-bold text-slate-800 text-right">הגדרות עסק</h1><p className="text-slate-500 text-right">ניהול שירותים, טפסים ושעות פעילות</p></div>
          <Button variant="outline" onClick={() => router.push('/business/dashboard')}><ArrowRight className="ml-2 h-4 w-4" /> חזרה לדשבורד</Button>
        </header>

        <Tabs defaultValue="hours" className="w-full" dir="rtl">
          <TabsList className="mb-6 w-full justify-start overflow-x-auto">
            <TabsTrigger value="hours">שעות פעילות</TabsTrigger>
            <TabsTrigger value="vacations">חופשות וחגים</TabsTrigger>
            <TabsTrigger value="services">שירותים וטיפולים</TabsTrigger>
            <TabsTrigger value="forms">טפסי הרשמה ושאלות</TabsTrigger>
            <TabsTrigger value="general">פרטים כלליים</TabsTrigger>
          </TabsList>

          <TabsContent value="hours" className="space-y-4 text-right">
            <Card>
              <CardHeader><CardTitle className="text-right">מערכת שעות שבועית</CardTitle><CardDescription className="text-right">הגדר שעות עבודה והפסקות.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                {DAYS.map((day) => {
                  const dayConfig = hours.find(h => h.day_of_week === day.id)
                  const dayBreaks = breaks.filter(b => b.day_of_week === day.id)
                  const isActive = !!dayConfig
                  return (
                    <div key={day.id} className={`border rounded-xl p-4 transition-all ${isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent opacity-70'}`}>
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex flex-col gap-4 min-w-[200px]">
                          <div className="flex items-center gap-4"><Switch checked={isActive} onCheckedChange={() => toggleDay(day.id, isActive)} /><Label className={`text-lg font-bold ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{day.label}</Label></div>
                          {isActive && (<div className="flex items-center gap-2 mr-10"><div className="relative"><Clock size={14} className="absolute top-2.5 right-2.5 text-slate-400 pointer-events-none" /><Input type="time" className="w-28 pr-8 text-center bg-slate-50 focus:bg-white" value={dayConfig.start_time.slice(0,5)} onChange={(e) => updateHourTime(day.id, 'start_time', e.target.value)} /></div><span className="text-slate-400 font-bold">-</span><div className="relative"><Clock size={14} className="absolute top-2.5 right-2.5 text-slate-400 pointer-events-none" /><Input type="time" className="w-28 pr-8 text-center bg-slate-50 focus:bg-white" value={dayConfig.end_time.slice(0,5)} onChange={(e) => updateHourTime(day.id, 'end_time', e.target.value)} /></div></div>)}
                        </div>
                        {isActive && (<div className="flex-1 border-r border-slate-100 pr-6 mr-6"><div className="flex items-center justify-between mb-3"><span className="text-sm font-semibold text-slate-500 flex items-center gap-1"><Coffee size={14} /> הפסקות ביום זה</span><Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 h-7 text-xs" onClick={() => addBreak(day.id)}>+ הוסף הפסקה</Button></div><div className="space-y-2">{dayBreaks.length === 0 && <div className="text-xs text-slate-400 italic pr-1">אין הפסקות מוגדרות</div>}{dayBreaks.map(brk => (<div key={brk.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200"><div className="text-xs text-slate-500">הפסקה:</div><Input type="time" className="h-8 w-24 text-center bg-white text-xs" value={brk.start_time.slice(0,5)} onChange={(e) => updateBreak(brk.id, 'start_time', e.target.value)} /><span className="text-slate-300">|</span><Input type="time" className="h-8 w-24 text-center bg-white text-xs" value={brk.end_time.slice(0,5)} onChange={(e) => updateBreak(brk.id, 'end_time', e.target.value)} /><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 mr-auto" onClick={() => deleteBreak(brk.id)}><Trash2 size={14} /></Button></div>))}</div></div>)}
                        {!isActive && <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic bg-slate-100/50 rounded-lg m-2">יום מנוחה</div>}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vacations" className="space-y-4 text-right">
            <Card>
              <CardHeader><CardTitle className="text-right">חופשות וסגירות מיוחדות</CardTitle><CardDescription className="text-right">הוסף תאריכים ספציפיים שבהם העסק סגור (חגים, חופשות וכו')</CardDescription></CardHeader>
              <CardContent>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1"><Label>תאריך התחלה</Label><Input type="date" value={newVacation.start} onChange={(e) => setNewVacation({...newVacation, start: e.target.value})} /></div>
                  <div className="space-y-1"><Label>תאריך סיום</Label><Input type="date" value={newVacation.end} onChange={(e) => setNewVacation({...newVacation, end: e.target.value})} /></div>
                  <div className="space-y-1 md:col-span-1"><Label>סיבה / תיאור</Label><Input placeholder="למשל: חופשת פסח" value={newVacation.reason} onChange={(e) => setNewVacation({...newVacation, reason: e.target.value})} /></div>
                  <Button onClick={addVacation} className="bg-blue-600 hover:bg-blue-700 text-white w-full"><Plus size={16} className="ml-2" /> הוסף חופשה</Button>
                </div>
                <div className="space-y-2">
                  {vacations.length === 0 ? <div className="text-center py-8 text-slate-400 flex flex-col items-center"><CalendarOff size={32} className="mb-2 opacity-50"/>אין חופשות עתידיות מוגדרות</div> : 
                    vacations.map((vac) => (
                      <div key={vac.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-4"><div className="bg-orange-50 text-orange-600 p-2 rounded-lg"><CalendarOff size={20} /></div><div><div className="font-bold text-slate-800">{vac.reason}</div><div className="text-sm text-slate-500">{format(new Date(vac.start_date), 'dd/MM/yyyy')} - {format(new Date(vac.end_date), 'dd/MM/yyyy')}</div></div></div>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => deleteVacation(vac.id)}><Trash2 size={18} /></Button>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-4 text-right">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-right">ניהול שירותים</CardTitle><CardDescription className="text-right">אלו הטיפולים שהלקוחות יוכלו להזמין. מחיר 0 יוסתר מהלקוח.</CardDescription></div><Button onClick={addService} size="sm"><Plus size={16} className="ml-2"/> הוסף שירות</Button></CardHeader>
              <CardContent className="space-y-4">
                {services.map((service) => {
                  const isEditing = editingServiceId === service.id
                  const data = isEditing ? tempServiceData : service
                  return (
                    <div key={service.id} className={`flex flex-col md:flex-row gap-4 items-end md:items-center border p-4 rounded-lg bg-white shadow-sm transition-all ${isEditing ? 'ring-2 ring-blue-500 border-transparent' : ''}`}>
                      <div className="flex-1 space-y-1 w-full text-right"><Label className="text-right block">שם השירות</Label><Input className="text-right" value={data.name} disabled={!isEditing} onChange={(e) => setTempServiceData({...tempServiceData, name: e.target.value})} /></div>
                      <div className="w-24 space-y-1 text-right"><Label className="text-right block">משך (דק')</Label><Input type="number" className="text-right" value={data.duration_minutes} disabled={!isEditing} onChange={(e) => setTempServiceData({...tempServiceData, duration_minutes: parseInt(e.target.value)})} /></div>
                      <div className="w-24 space-y-1 text-right"><Label className="text-right block">מחיר (₪)</Label><Input type="number" className="text-right" value={data.price} disabled={!isEditing} onChange={(e) => setTempServiceData({...tempServiceData, price: parseInt(e.target.value)})} /></div>
                      <div className="flex gap-2">{isEditing ? <><Button size="icon" className="bg-green-600 hover:bg-green-700 text-white" onClick={saveService}><Check size={18} /></Button><Button size="icon" variant="outline" onClick={cancelEditingService}><X size={18} /></Button></> : <><Button size="icon" variant="outline" onClick={() => startEditingService(service)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteService(service.id)}><Trash2 size={18} /></Button></>}</div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forms" className="space-y-6 text-right">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4"><div><CardTitle className="text-right">שאלות בקביעת תור (Booking)</CardTitle><CardDescription className="text-right">שאלות שיופיעו ללקוח בעת הזמנת תור</CardDescription></div><Button onClick={() => addField('BOOKING')} variant="outline" size="sm"><Plus size={16} className="ml-2"/> הוסף שאלה</Button></CardHeader>
              <CardContent className="pt-6 space-y-4">
                {formFields.filter(f => f.form_type === 'BOOKING').map((field) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border p-3 rounded-lg bg-slate-50/50">
                    <div className="md:col-span-5 text-right"><Label className="mb-1 block text-xs text-slate-500">נוסח השאלה</Label><Input className="text-right" placeholder="שם השאלה" value={field.label} onChange={(e) => updateField(field.id, 'label', e.target.value)} /></div>
                    <div className="md:col-span-3 text-right"><Label className="mb-1 block text-xs text-slate-500">סוג תשובה</Label><Select value={field.field_type} onValueChange={(val: string) => updateField(field.id, 'field_type', val)} dir="rtl"><SelectTrigger className="text-right"><SelectValue placeholder="סוג שדה" /></SelectTrigger><SelectContent><SelectItem value="TEXT">טקסט קצר</SelectItem><SelectItem value="TEXTAREA">טקסט ארוך</SelectItem><SelectItem value="BOOLEAN">כן / לא</SelectItem><SelectItem value="NUMBER">מספר</SelectItem></SelectContent></Select></div>
                    <div className="md:col-span-3 flex items-center gap-2 justify-start"><Switch checked={field.is_required} onCheckedChange={(checked: boolean) => updateField(field.id, 'is_required', checked)} /><Label className="text-xs">שדה חובה</Label></div>
                    <div className="md:col-span-1 text-left"><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteField(field.id)}><Trash2 size={16} /></Button></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4"><div><CardTitle className="text-right">שאלות בטופס ייעוץ (Inquiry)</CardTitle><CardDescription className="text-right">שאלות ללקוחות מתעניינים</CardDescription></div><Button onClick={() => addField('INQUIRY')} variant="outline" size="sm"><Plus size={16} className="ml-2"/> הוסף שאלה</Button></CardHeader>
              <CardContent className="pt-6 space-y-4">
                {formFields.filter(f => f.form_type === 'INQUIRY').map((field) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border p-3 rounded-lg bg-slate-50/50">
                    <div className="md:col-span-5 text-right"><Label className="mb-1 block text-xs text-slate-500">נוסח השאלה</Label><Input className="text-right" value={field.label} onChange={(e) => updateField(field.id, 'label', e.target.value)} /></div>
                    <div className="md:col-span-3 text-right"><Label className="mb-1 block text-xs text-slate-500">סוג תשובה</Label><Select value={field.field_type} onValueChange={(val: string) => updateField(field.id, 'field_type', val)} dir="rtl"><SelectTrigger className="text-right"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TEXT">טקסט קצר</SelectItem><SelectItem value="TEXTAREA">טקסט ארוך</SelectItem><SelectItem value="BOOLEAN">כן / לא</SelectItem></SelectContent></Select></div>
                    <div className="md:col-span-3 flex items-center gap-2 justify-start"><Switch checked={field.is_required} onCheckedChange={(checked: boolean) => updateField(field.id, 'is_required', checked)} /><Label className="text-xs">שדה חובה</Label></div>
                    <div className="md:col-span-1 text-left"><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteField(field.id)}><Trash2 size={16} /></Button></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* טאב 4: כללי + לוגו + סיסמה */}
          <TabsContent value="general" className="text-right">
             <Card>
               <CardHeader><CardTitle className="text-right">פרטי העסק ולוגו</CardTitle></CardHeader>
               <CardContent className="space-y-6">
                 
                 {/* אזור העלאת לוגו */}
                 <div className="flex flex-col items-center sm:flex-row gap-6 p-4 border rounded-lg bg-slate-50/50">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-white relative group">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Business Logo" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="text-slate-300" size={32} />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <label htmlFor="logo-upload" className="cursor-pointer text-white text-xs font-medium">שנה</label>
                        </div>
                    </div>
                    <div className="flex-1 space-y-2 text-right">
                        <Label>לוגו העסק</Label>
                        <p className="text-xs text-slate-500">מומלץ להעלות תמונה מרובעת (500x500 פיקסלים). גודל מקסימלי: 2MB.</p>
                        <div className="flex items-center gap-2">
                             <Input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                             <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()} disabled={uploadingLogo}>
                                 {uploadingLogo ? <Loader2 className="animate-spin ml-2 h-4 w-4"/> : <Upload className="ml-2 h-4 w-4"/>} 
                                 העלה תמונה חדשה
                             </Button>
                        </div>
                    </div>
                 </div>

                 <div className="space-y-2 text-right"><Label>שם העסק</Label><Input defaultValue={business.name} disabled className="bg-slate-100 text-right" /><p className="text-xs text-slate-500">לשינוי שם העסק יש לפנות לתמיכה</p></div>
                 <div className="space-y-2 text-right"><Label>תיאור</Label><Input className="text-right" defaultValue={business.description || ''} onChange={(e) => setBusiness({...business, description: e.target.value})} /></div>
                 <div className="space-y-2 text-right"><Label>כתובת</Label><Input className="text-right" defaultValue={business.address || ''} /></div>
                 <Button className="mt-4" onClick={() => alert('שמירת פרטים כלליים - בהמשך')}>שמור שינויים</Button>
               </CardContent>
             </Card>

             <Card className="mt-6 border-red-100">
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
      </div>
    </div>
  )
}