import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(request) {
  try {
    const { url, name } = await request.json()

    if (!url) {
      return Response.json({ success: false, error: 'no url' })
    }

    const fetchRes = await fetch(url)
    const buffer = await fetchRes.arrayBuffer()

    let html = new TextDecoder('tis-620').decode(buffer)
    if (!html.includes('\u0e01')) {
      html = new TextDecoder('utf-8').decode(buffer)
    }

    const plainText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000)

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
Extract research funding information from the text below.
Reply ONLY with a JSON object with these fields:
- name: funding source name (in Thai if available)
- requirements: scope and eligibility requirements (summarized in Thai)
- deadline: application deadline in YYYY-MM-DD format, or null if not found
- status: "open", "closed", or "upcoming"

Text:
${plainText}
`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const clean = text.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(clean)

    const { data, error } = await supabase
      .from('funding_sources')
      .insert({
        name: name || extracted.name,
        url: url,
        requirements: extracted.requirements,
        deadline: extracted.deadline,
        status: extracted.status || 'open'
      })
      .select()
      .single()

    if (error) {
      return Response.json({ success: false, error: error.message })
    }

    return Response.json({ success: true, data })

  } catch (err) {
    return Response.json({ success: false, error: err.message })
  }
}