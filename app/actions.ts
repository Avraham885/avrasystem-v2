'use server'

import { createClient } from '@supabase/supabase-js'

// יצירת קליינט עם הרשאות על (Admin)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function createBusinessWithOwner(formData: any) {
  const { name, slug, description, owner_email, owner_password, owner_phone, owner_name } = formData

  try {
    // 1. יצירת המשתמש ב-Auth
    const { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: owner_email,
      password: owner_password,
      email_confirm: true,
      user_metadata: { full_name: owner_name, phone: owner_phone }
    })

    if (authError) throw new Error('שגיאה ביצירת משתמש: ' + authError.message)
    const userId = userAuth.user.id

    // 2. יצירת פרופיל (אם הטריגר לא תפס, ליתר ביטחון)
    // הערה: הטריגר SQL שעשינו אמור לעבוד, אבל ה-Service Role עוקף RLS אז אפשר גם ישירות
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: owner_email,
      full_name: owner_name,
      phone: owner_phone
    })

    // 3. יצירת העסק
    const { error: bizError } = await supabaseAdmin.from('businesses').insert({
      name,
      slug,
      description,
      owner_id: userId,
      is_active: true
    })

    if (bizError) throw new Error('שגיאה ביצירת עסק: ' + bizError.message)

    return { success: true }

  } catch (error: any) {
    console.error(error)
    return { success: false, error: error.message }
  }
}