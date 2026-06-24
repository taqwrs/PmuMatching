import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(request) {
  try {
    const { url, name } = await request.json()

    if (!url) {
      return Response.json({ success: false, error: 'no url' })
    }

    const encodedUrl = encodeURI(url)
    console.log('Fetching:', encodedUrl)

    const fetchRes = await fetch(encodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    console.log('Status:', fetchRes.status)
    console.log('Content-Type:', fetchRes.headers.get('content-type'))

    const buffer = await fetchRes.arrayBuffer()
    console.log('Buffer size:', buffer.byteLength)

    const contentType = fetchRes.headers.get('content-type') || ''
    let html = ''

    if (contentType.includes('utf-8') || contentType.includes('UTF-8')) {
      html = new TextDecoder('utf-8').decode(buffer)
    } else {
      html = new TextDecoder('tis-620').decode(buffer)
    }

    console.log('HTML preview:', html.slice(0, 200))

    const plainText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000)

    console.log('Text preview:', plainText.slice(0, 200))

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
Extract research funding information from the text below.
Reply ONLY with a JSON object with these fields:
- name: funding source name
- requirements: scope and eligibility requirements
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
    console.error('ERROR:', err.message)
    console.error('STACK:', err.stack)
    return Response.json({ success: false, error: err.message })
  }
}