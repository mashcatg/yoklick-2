import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { prompt, thumbnailId } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Extract tags using Gemini 2.0 Flash
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract 5-10 relevant tags from this YouTube thumbnail prompt. Return only the tags as a JSON array of strings, no explanation:

Prompt: "${prompt}"

Example output: ["gaming", "tech", "youtube", "thumbnail"]`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 100,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const tagsText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!tagsText) {
      throw new Error("Failed to extract tags from Gemini response");
    }

    // Parse the JSON array from the response
    let tags: string[] = [];
    try {
      // Extract JSON array from the response
      const jsonMatch = tagsText.match(/\[.*\]/);
      if (jsonMatch) {
        tags = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by comma and clean
        tags = tagsText
          .replace(/[\[\]"]/g, '')
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }
    } catch (error) {
      console.error("Error parsing tags:", error);
      // Fallback: extract simple keywords
      const keywords = prompt.toLowerCase().match(/\b\w{3,}\b/g) || [];
      tags = [...new Set(keywords)].slice(0, 5);
    }

    // If thumbnailId is provided, save tags to database
    if (thumbnailId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Save tags with confidence scores
      for (const tag of tags) {
        await supabase
          .from("thumbnail_tags")
          .insert({
            thumbnail_id: thumbnailId,
            tag: tag.toLowerCase(),
            confidence_score: 0.8 // Default confidence
          });
      }
    }

    return NextResponse.json({ 
      success: true, 
      tags: tags,
      thumbnailId 
    });

  } catch (error) {
    console.error("Error extracting tags:", error);
    return NextResponse.json({ 
      error: "Failed to extract tags",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 