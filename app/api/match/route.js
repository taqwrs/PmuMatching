import Groq from 'groq-sdk'
import { supabase } from '@/lib/supabase'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export async function POST(request) {
  try {
    const { abstract, proposalTitle } = await request.json()

    if (!abstract) {
      return Response.json({ success: false, error: 'กรุณาใส่ abstract' })
    }

    // ดึงแหล่งทุนที่เปิดรับอยู่จาก Supabase
    const { data: fundings, error } = await supabase
      .from('funding_sources')
      .select('id, name, requirements, deadline, status')
      .eq('status', 'open')

    if (error) {
      return Response.json({ success: false, error: error.message })
    }

    if (!fundings || fundings.length === 0) {
      return Response.json({ success: false, error: 'ไม่มีแหล่งทุนที่เปิดรับอยู่ในระบบ' })
    }

    // สร้าง prompt
    const fundingList = fundings.map((f, i) =>
      `${i + 1}. ชื่อ: ${f.name}\n   กรอบโจทย์: ${f.requirements}\n   วันปิดรับ: ${f.deadline || 'ไม่ระบุ'}`
    ).join('\n\n')

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `คุณเป็นผู้เชี่ยวชาญด้านการวิจัยและแหล่งทุน
วิเคราะห์ความเหมาะสมระหว่าง abstract ของโครงการวิจัยกับแหล่งทุนแต่ละแห่ง

Abstract โครงการ:
${abstract}

แหล่งทุนที่เปิดรับอยู่:
${fundingList}

ตอบเป็น JSON array เท่านั้น แต่ละ item มีฟิลด์:
- funding_name: ชื่อแหล่งทุน
- score: คะแนนความเหมาะสม 0-100
- reason_match: เหตุผลที่เหมาะสม 2-3 ประโยค
- reason_mismatch: เหตุผลที่ไม่เหมาะสมหรือข้อจำกัด 1-2 ประโยค

เรียงลำดับจากคะแนนมากไปน้อย`
        }
      ],
      response_format: { type: 'json_object' }
    })

    const raw = JSON.parse(completion.choices[0].message.content)
    const results = raw.results || raw.matches || Object.values(raw)[0]

    // บันทึกผลลง Supabase
    if (proposalTitle) {
      const { data: proposal } = await supabase
        .from('proposals')
        .insert({ title: proposalTitle, content_text: abstract })
        .select()
        .single()

      if (proposal) {
        const matchRows = results.map(r => {
          const funding = fundings.find(f => f.name === r.funding_name)
          return {
            proposal_id: proposal.id,
            funding_id: funding?.id || null,
            score: r.score,
            reason_match: r.reason_match,
            reason_mismatch: r.reason_mismatch
          }
        })
        await supabase.from('match_results').insert(matchRows)
      }
    }

    return Response.json({ success: true, results })

  } catch (err) {
    console.error('ERROR:', err.message)
    return Response.json({ success: false, error: err.message })
  }
}