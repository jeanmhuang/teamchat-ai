import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(req: NextRequest) {
  try {
    const { message, channelId, channelName, userName } = await req.json()

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(10)

    const conversationContext = recentMessages
      ?.reverse()
      .map(m => `${m.user_name}: ${m.content}`)
      .join('\n') || ''

    // Search knowledge base for relevant context
    let knowledgeContext = ''
    try {
      // Create embedding for the query
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: message
      })
      const embedding = embeddingRes.data[0].embedding

      // Search for relevant docs
      const { data: docs } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_count: 3
      })

      if (docs && docs.length > 0) {
        knowledgeContext = `\n\nRelevant knowledge base articles:\n${docs.map((d: any) => `- ${d.title}: ${d.content}`).join('\n')}`
      }
    } catch (e) {
      // Knowledge base not set up yet, continue without it
      console.log('Knowledge base not available')
    }

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are Claude, a helpful AI assistant in a team chat app similar to Slack. You're chatting in the #${channelName} channel.

Your personality:
- Friendly and helpful, but concise
- Use casual language appropriate for chat
- Keep responses under 200 words unless asked for detail
- Use emoji occasionally but don't overdo it
- If you don't know something, say so
- You can help with coding, writing, brainstorming, and general questions

${knowledgeContext}

Recent conversation:
${conversationContext}`
        },
        {
          role: 'user',
          content: `${userName} says: ${message}`
        }
      ]
    })

    const response = completion.choices[0].message.content

    return NextResponse.json({ response })

  } catch (error) {
    console.error('AI response error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
