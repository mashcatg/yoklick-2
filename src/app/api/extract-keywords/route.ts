import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Valid prompt is required' }, { status: 400 });
    }

    const promptText = prompt;
    console.log('Extracting keywords for prompt:', promptText);

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found');
      throw new Error('Gemini API key not configured');
    }

    // Use Gemini 2.0 Flash to extract 2-5 key words
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract 2-5 key tags or keywords from this YouTube thumbnail prompt that would be most relevant for finding similar thumbnails. Focus on the main subject, theme, or visual elements. Return only the tags separated by commas, no explanations or extra text: "${promptText}"`
          }]
        }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 100,
        }
      })
    });

    console.log('Gemini response status:', geminiResponse.status);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response data:', geminiData);
    
    const extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!extractedText) {
      console.error('No text in Gemini response');
      throw new Error('No response from Gemini API');
    }

    console.log('Extracted text:', extractedText);

    // Parse the keywords
    const keywords = extractedText
      .split(',')
      .map((k: string) => k.trim().toLowerCase())
      .filter((k: string) => k.length > 0)
      .slice(0, 5);

    console.log('Final keywords:', keywords);
    return NextResponse.json({ keywords });
  } catch (error) {
    console.error('Error extracting keywords:', error);
    
    // Fallback: extract basic keywords manually
    try {
      const body = await req.json();
      const { prompt } = body;
      
      if (prompt && typeof prompt === 'string') {
        const fallbackKeywords = prompt
          .toLowerCase()
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that', 'from'].includes(word))
          .slice(0, 5);
        
        console.log('Using fallback keywords:', fallbackKeywords);
        return NextResponse.json({ keywords: fallbackKeywords });
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }
    
    return NextResponse.json({ keywords: [] });
  }
} 