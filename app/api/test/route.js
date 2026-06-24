import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('funding_sources')
    .select('*')
    .limit(1)

  if (error) {
    return Response.json({ success: false, error: error.message })
  }

  return Response.json({ success: true, message: 'เชื่อมต่อ Supabase สำเร็จ' })
}