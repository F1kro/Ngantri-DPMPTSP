import { createClient } from '@/lib/supabase/client'

export const createLog = async (
  action: 'BOOKING' | 'CALL' | 'COMPLETE' | 'CANCEL' | 'ERROR' | 'SYSTEM' | 'SERVICE_CRUD' | 'PRINT_REKAP',
  message: string,
  status: 'info' | 'warning' | 'error' = 'info',
  metadata: any = {}
) => {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.from('system_logs').insert({
      action_type: action,
      message: message,
      status: status,
      metadata: metadata,
    })

    if (error) console.error('Gagal simpan log:', error)
  } catch (err) {
    console.error('Log Error:', err)
  }
}