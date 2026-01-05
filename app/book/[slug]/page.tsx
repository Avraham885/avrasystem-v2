'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar as CalendarIcon, MessageSquare, MapPin, Phone, ArrowRight, Loader2, Upload, X, Check, User, AlertCircle, Lock, UserPlus, Clock } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { format, addMinutes, parse, isBefore, isAfter, startOfDay, isWithinInterval } from "date-fns"
import { he } from "date-fns/locale"
import { cn } from "@/lib/utils"

// --- Types ---
type Business = { id: string; name: string; description: string | null; address: string | null; phone: string | null; logo_url: string | null }
type Service = { id: string; name: string; duration_minutes: number; price: number }
type FormField = { id: string; label: string; field_type: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN' | 'TEXTAREA'; is_required: boolean; options: string[] | null; order_index: number }
type MembershipStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED'

export default function BookingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const slug = params?.slug as string
  const type = searchParams.get('type') as 'consultation' | 'appointment' || 'appointment'
  const isAppointment = type === 'appointment'

  // --- State ---
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [customFields, setCustomFields] = useState<FormField[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [userId, setUserId] = useState<string | null>(null)
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>('NONE')
  const [checkingMembership, setCheckingMembership] = useState(true)
  
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [dayClosed, setDayClosed] = useState(false)
  const [vacationReason, setVacationReason] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- 1. Initial Data Fetch ---
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return
      setLoading(true)

      try {
        const { data: bizData, error: bizError } = await supabase.from('businesses').select('*').eq('slug', slug).single()
        if (bizError || !bizData) throw new Error('העסק לא נמצא')
        setBusiness(bizData)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
          if (profile) { setValue('fullName', profile.full_name); setValue('phone', profile.phone); }
          const { data: membership } = await supabase.from('business_clients').select('status').eq('business_id', bizData.id).eq('user_id', user.id).single()
          if (membership) setMembershipStatus(membership.status as MembershipStatus)
          else setMembershipStatus('NONE')
        }
        setCheckingMembership(false)

        const dbFormType = isAppointment ? 'BOOKING' : 'INQUIRY'
        const { data: fieldsData } = await supabase.from('form_fields').select('*').eq('business_id', bizData.id).eq('form_type', dbFormType).eq('is_active', true).order('order_index', { ascending: true })
        setCustomFields(fieldsData || [])

        if (isAppointment) {
          const { data: srvData } = await supabase.from('services').select('*').eq('business_id', bizData.id).eq('is_active', true)
          setServices(srvData || [])
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'שגיאה בטעינת הנתונים')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug, type, setValue])

  // --- 2. Availability Calculation ---
  useEffect(() => {
    const canBook = !userId || (userId && membershipStatus === 'APPROVED')
    if (!isAppointment || !date || !business || !selectedServiceId || !canBook) {
      setAvailableSlots([])
      return
    }

    const fetchAvailability = async () => {
      setLoadingSlots(true)
      setDayClosed(false)
      setVacationReason(null)
      setSelectedTime(null)

      try {
        const service = services.find(s => s.id === selectedServiceId)
        const duration = service?.duration_minutes || 30
        
        // Check Vacations
        const { data: vacations } = await supabase.from('business_vacations').select('*').eq('business_id', business.id)
        if (vacations && vacations.length > 0) {
          const selectedDateStr = format(date, 'yyyy-MM-dd')
          const activeVacation = vacations.find(v => selectedDateStr >= v.start_date && selectedDateStr <= v.end_date)
          if (activeVacation) {
            setVacationReason(activeVacation.reason)
            setAvailableSlots([])
            setLoadingSlots(false)
            return
          }
        }

        const dayOfWeek = date.getDay()
        const { data: hoursData } = await supabase.from('business_hours').select('*').eq('business_id', business.id).eq('day_of_week', dayOfWeek).single()

        if (!hoursData) {
          setDayClosed(true)
          setAvailableSlots([])
          setLoadingSlots(false)
          return
        }

        const { data: breaksData } = await supabase.from('business_breaks').select('*').eq('business_id', business.id).eq('day_of_week', dayOfWeek)

        const startOfDayStr = new Date(date.setHours(0,0,0,0)).toISOString()
        const endOfDayStr = new Date(date.setHours(23,59,59,999)).toISOString()
        
        const { data: existingApps } = await supabase
          .from('appointments')
          .select('start_time, end_time')
          .eq('business_id', business.id)
          .neq('status', 'CANCELLED')
          .neq('status', 'REJECTED')
          .gte('start_time', startOfDayStr)
          .lte('start_time', endOfDayStr)

        const slots: string[] = []
        const now = new Date()
        const isToday = date.toDateString() === now.toDateString()

        const parseTimeSafe = (timeStr: string, baseDate: Date) => {
            const timePart = timeStr.slice(0, 5); 
            return parse(timePart, 'HH:mm', baseDate);
        }

        let currentTime = parseTimeSafe(hoursData.start_time, date)
        const endTime = parseTimeSafe(hoursData.end_time, date)
        const intervalStep = 15 

        while (isBefore(currentTime, endTime)) {
          const slotStart = currentTime
          const slotEnd = addMinutes(currentTime, duration)

          if (isAfter(slotEnd, endTime)) break;

          if (isToday && isBefore(slotStart, addMinutes(now, 1))) {
            currentTime = addMinutes(currentTime, intervalStep)
            continue
          }

          let inBreak = false
          if (breaksData) {
            for (const brk of breaksData) {
              const breakStart = parseTimeSafe(brk.start_time, date)
              const breakEnd = parseTimeSafe(brk.end_time, date)
              if (isBefore(slotStart, breakEnd) && isAfter(slotEnd, breakStart)) {
                inBreak = true; break;
              }
            }
          }
          if (inBreak) { currentTime = addMinutes(currentTime, intervalStep); continue; }

          let isBooked = false
          if (existingApps) {
            for (const app of existingApps) {
              const appStart = new Date(app.start_time)
              const appEnd = new Date(app.end_time)
              if (isBefore(slotStart, appEnd) && isAfter(slotEnd, appStart)) {
                isBooked = true; break;
              }
            }
          }
          if (isBooked) { currentTime = addMinutes(currentTime, intervalStep); continue; }

          slots.push(format(slotStart, 'HH:mm'))
          currentTime = addMinutes(currentTime, intervalStep)
        }

        setAvailableSlots(slots)

      } catch (err) {
        console.error(err)
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchAvailability()
  }, [date, selectedServiceId, business, services, isAppointment, userId, membershipStatus])

  // --- Handlers ---
  const handleRequestMembership = async () => {
    if (!userId || !business) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('business_clients').insert({ business_id: business.id, user_id: userId, status: 'PENDING' })
      if (error) throw error
      setMembershipStatus('PENDING')
      alert("בקשת ההצטרפות נשלחה בהצלחה!")
    } catch (err: any) { alert("שגיאה: " + err.message) } finally { setSubmitting(false) }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      if (selectedImages.length + files.length > 2) { alert("ניתן להעלות עד 2 תמונות בלבד"); return }
      const newImages = [...selectedImages, ...files]
      setSelectedImages(newImages)
      const newUrls = files.map(file => URL.createObjectURL(file))
      setImagePreviewUrls([...imagePreviewUrls, ...newUrls])
    }
  }

  const removeImage = (index: number) => {
    const newImages = [...selectedImages]; newImages.splice(index, 1); setSelectedImages(newImages)
    const newUrls = [...imagePreviewUrls]; URL.revokeObjectURL(newUrls[index]); newUrls.splice(index, 1); setImagePreviewUrls(newUrls)
  }

  const onSubmit = async (data: any) => {
    if (isAppointment && !selectedServiceId) { alert("אנא בחר שירות מהרשימה"); return }
    if (isAppointment && (!date || !selectedTime)) { alert("אנא בחר תאריך ושעה"); return }
    setSubmitting(true)
    try {
      const uploadedImagePaths: string[] = []
      const bucketName = isAppointment ? 'appointments' : 'inquiries'
      for (const file of selectedImages) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, file)
        if (uploadError) throw uploadError
        if (uploadData?.path) uploadedImagePaths.push(uploadData.path)
      }
      const { fullName, phone, freeText, ...rest } = data
      
      // סטטוס אוטומטי: אם הלקוח הוא חבר מאושר -> CONFIRMED, אחרת -> PENDING
      const initialStatus = (userId && membershipStatus === 'APPROVED') ? 'CONFIRMED' : 'PENDING'

      const payload = { business_id: business!.id, client_id: userId, guest_name: fullName, guest_phone: phone, custom_fields_data: rest, image_urls: uploadedImagePaths, status: isAppointment ? initialStatus : 'NEW' }
      
      let errorInsert = null
      if (isAppointment) {
        const [hours, minutes] = selectedTime!.split(':')
        const startTime = new Date(date!); startTime.setHours(parseInt(hours), parseInt(minutes))
        const service = services.find(s => s.id === selectedServiceId)
        const endTime = new Date(startTime.getTime() + (service?.duration_minutes || 30) * 60000)
        const { error } = await supabase.from('appointments').insert({ ...payload, service_id: selectedServiceId, start_time: startTime.toISOString(), end_time: endTime.toISOString(), client_notes: freeText })
        errorInsert = error
      } else {
        const { error } = await supabase.from('inquiries').insert({ ...payload, subject: 'פנייה מאתר הבית', message: freeText })
        errorInsert = error
      }
      if (errorInsert) throw errorInsert
      
      if (userId) { alert("הפעולה בוצעה בהצלחה! תוכל לראות זאת באזור האישי."); router.push('/dashboard') }
      else { alert("הטופס נשלח בהצלחה! ניצור איתך קשר."); router.push('/') }
    } catch (err: any) { console.error(err); alert("שגיאה: " + err.message) } finally { setSubmitting(false) }
  }

  // --- UI Render ---
  if (loading || checkingMembership) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
  if (error || !business) return <div className="p-10 text-center">שגיאה: {error}</div>

  const showBookingForm = !isAppointment || !userId || membershipStatus === 'APPROVED'
  
  return (
    <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
      <div className="bg-white border-b border-slate-200 pb-8 pt-6 px-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" onClick={() => router.back()} className="mb-2 text-slate-500 p-0 h-auto hover:bg-transparent"><ArrowRight className="ml-2 w-4 h-4" /> חזרה</Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0">{business.logo_url ? <img src={business.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-2xl">{business.name[0]}</div>}</div>
              <div><h1 className="text-xl md:text-2xl font-bold text-slate-900">{business.name}</h1><div className="text-xs text-slate-500 flex gap-2 mt-1">{business.address && <span className="flex items-center gap-1"><MapPin size={12}/> {business.address}</span>}{business.phone && <span className="flex items-center gap-1"><Phone size={12}/> {business.phone}</span>}</div></div>
            </div>
            {userId && <div className="hidden md:flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-blue-700 text-sm font-medium border border-blue-100"><User size={14} /> {membershipStatus === 'APPROVED' ? 'לקוח מועדון' : 'מחובר'}</div>}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 mt-6">
        {!showBookingForm ? (
          <Card className="shadow-lg border-slate-200 text-center py-10">
            <CardContent className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-2">{membershipStatus === 'PENDING' ? <Clock size={40} className="text-blue-500" /> : <Lock size={40} className="text-blue-500" />}</div>
              {membershipStatus === 'NONE' && <><h2 className="text-2xl font-bold text-slate-800">הצטרפות למועדון הלקוחות</h2><p className="text-slate-600 max-w-md">כדי לקבוע תור ב{business.name}, עליך לבקש להצטרף למועדון הלקוחות.</p><Button size="lg" onClick={handleRequestMembership} disabled={submitting} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-6 h-auto text-lg shadow-lg shadow-blue-200">{submitting ? <Loader2 className="animate-spin" /> : <><UserPlus className="ml-2" /> שלח בקשת הצטרפות</>}</Button></>}
              {membershipStatus === 'PENDING' && <><h2 className="text-2xl font-bold text-slate-800">בקשתך בבדיקה</h2><p className="text-slate-600 max-w-md">בקשת ההצטרפות שלך התקבלה וממתינה לאישור העסק.</p><Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard')}>חזרה לאזור האישי</Button></>}
              {membershipStatus === 'REJECTED' && <><h2 className="text-2xl font-bold text-red-600">בקשתך נדחתה</h2><p className="text-slate-600 max-w-md">לצערנו לא ניתן להצטרף למועדון הלקוחות כרגע.</p></>}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-slate-200">
            <CardHeader className={`border-b border-slate-100 ${isAppointment ? 'bg-green-50' : 'bg-blue-50'}`}><CardTitle className="text-lg flex items-center gap-2">{isAppointment ? <><CalendarIcon className="w-5 h-5 text-green-600" /> קביעת תור</> : <><MessageSquare className="w-5 h-5 text-blue-600" /> יצירת קשר</>}</CardTitle></CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-4"><h3 className="font-semibold text-slate-800 border-r-4 border-slate-300 pr-3 flex justify-between items-center">פרטים אישיים {userId && <Badge variant="secondary" className="font-normal text-xs bg-slate-100 text-slate-500">נלקח מהפרופיל שלך</Badge>}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-right block">שם מלא *</Label><Input className="text-right" id="fullName" {...register("fullName", { required: true })} /></div><div className="space-y-2"><Label className="text-right block">טלפון נייד *</Label><Input className="text-right" id="phone" {...register("phone", { required: true })} /></div></div></div>
                
                {isAppointment && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 border-r-4 border-green-500 pr-3 text-right">בחירת שירות</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {services.map(service => (
                        <div 
                          key={service.id} 
                          onClick={() => setSelectedServiceId(service.id)}
                          className={cn("flex justify-between items-center p-4 border rounded-xl cursor-pointer transition-all", selectedServiceId === service.id ? "border-green-500 bg-green-50 ring-1 ring-green-500" : "border-slate-200 hover:border-green-300")}
                        >
                          <div className="text-right">
                            <div className="font-bold text-slate-800">{service.name}</div>
                            <div className="text-sm text-slate-500">{service.duration_minutes} דקות</div>
                          </div>
                          <div className="flex items-center gap-3 font-bold text-green-700">
                            {/* בדיקת מחיר 0 - אם המחיר הוא 0, לא מציגים כלום */}
                            {service.price > 0 && `₪${service.price}`}
                            {selectedServiceId === service.id && <Check size={16} className="bg-green-500 text-white rounded-full p-0.5" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {isAppointment && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 border-r-4 border-orange-500 pr-3 text-right">בחירת מועד</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2"><Label className="text-right block">תאריך</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-12 text-right", !date && "text-muted-foreground")}><CalendarIcon className="ml-2 h-4 w-4" />{date ? format(date, "PPP", { locale: he }) : <span>בחר תאריך</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} /></PopoverContent></Popover></div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-right block">שעה</Label>
                        {!selectedServiceId ? <div className="flex items-center gap-2 text-sm text-orange-600 p-3 border border-orange-200 bg-orange-50 rounded" dir="rtl"><AlertCircle size={16} /> יש לבחור שירות כדי לראות זמנים</div> : 
                         loadingSlots ? <div className="flex items-center gap-2 text-sm text-slate-500 p-3 border border-slate-100 rounded bg-slate-50"><Loader2 className="animate-spin w-4 h-4" /> מחשב זמינות...</div> : 
                         vacationReason ? <div className="text-sm text-red-500 p-3 border border-red-100 bg-red-50 rounded text-right font-bold">העסק בחופשה: {vacationReason}</div> :
                         dayClosed ? <div className="text-sm text-red-500 p-3 border border-red-100 bg-red-50 rounded text-right">העסק סגור ביום זה</div> : 
                         availableSlots.length === 0 ? <div className="text-sm text-slate-500 p-3 border border-dashed rounded bg-slate-50 text-right">אין תורים פנויים בתאריך זה</div> : 
                         <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-md" dir="ltr">{availableSlots.map((time) => (<Button key={time} type="button" variant="outline" className={cn("text-xs h-9", selectedTime === time && "bg-slate-900 text-white")} onClick={() => setSelectedTime(time)}>{time}</Button>))}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {customFields.length > 0 && <div className="space-y-4"><h3 className="font-semibold text-slate-800 border-r-4 border-purple-500 pr-3 text-right">שאלות נוספות</h3><div className="grid grid-cols-1 gap-4">{customFields.map((field) => (<div key={field.id} className="space-y-2"><Label className="text-right block">{field.label} {field.is_required && <span className="text-red-500">*</span>}</Label>{field.field_type === 'TEXTAREA' ? <Textarea className="text-right" {...register(`custom_${field.id}`, { required: field.is_required })} /> : field.field_type === 'BOOLEAN' ? <select {...register(`custom_${field.id}`, { required: field.is_required })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right" dir="rtl"><option value="">בחר...</option><option value="yes">כן</option><option value="no">לא</option></select> : <Input className="text-right" type={field.field_type === 'NUMBER' ? 'number' : 'text'} {...register(`custom_${field.id}`, { required: field.is_required })} />}</div>))}</div></div>}
                <div className="space-y-2"><Label className="text-right block">הערות נוספות / בקשות מיוחדות</Label><Textarea className="text-right" {...register("freeText")} placeholder="כתוב כאן כל דבר נוסף שחשוב שנדע..." /></div>
                <div className="space-y-4 pt-4 border-t border-slate-100"><h3 className="font-semibold text-slate-800 border-r-4 border-blue-400 pr-3 text-right">תמונות (אופציונלי)</h3><div className="flex flex-wrap gap-4 justify-start">{imagePreviewUrls.map((url, index) => (<div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 group"><img src={url} className="w-full h-full object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button></div>))}{selectedImages.length < 2 && (<div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors text-slate-400 hover:text-blue-500"><Upload size={24} /> <span className="text-xs mt-1">הוסף תמונה</span></div>)}</div><input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageSelect} /></div>
                <div className="pt-6 sticky bottom-4 z-20"><Button type="submit" disabled={submitting} className={`w-full h-14 text-lg font-bold shadow-xl transition-all ${isAppointment ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{submitting ? <><Loader2 className="animate-spin ml-2" /> שולח...</> : (isAppointment ? ' אשר קביעת תור' : 'שלח פנייה לייעוץ')}</Button></div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}