import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
    // Apply rate limiting
    const rateLimitResult = rateLimit(req as any, 'generate');
    if (!rateLimitResult.allowed) {
        return rateLimitResult.response;
    }

    const SYSTEM_PROMPT = `Assume that you a thumbnail idea generator and you generate high-quality, unique YouTube thumbnail idea in one paragraph, ensuring each design has a distinct theme and visual style. The topic of the thumbnail should be bold and highly readable, using a randomly chosen thumbnail suitable position and font style such as sleek modern typography, futuristic neon text, vintage serif, bold graffiti, elegant calligraphy, or embossed metallic lettering. The background should always be different and theme-matching, cycling between cinematic landscapes, futuristic cityscapes, tech-inspired holographic visuals, vintage paper textures, dramatic lighting effects, minimalistic gradients, high-contrast infographics, grunge textures, or playful 2D flat designs. The color palette should be adaptive, sometimes using vibrant neon contrasts, deep cinematic tones, pastel soft shades, monochrome elegance, or warm golden hues to complement the theme. The thumbnail should feature a strong focal element, such as a symbolic object, eye-catching icon, dramatic perspective, 3D effects, or a bold frame composition to enhance visual storytelling. The response must always avoid watermarks, haram elements, and living beings while maintaining a professional, high-conversion click-through design. Each response should be fully unique, optimized for engagement, and ready for use as a premium-quality YouTube thumbnail. ALso the generated output should be in a para of 1024 characters Here is an example of a correct answer that is expected from you as an AI assistant: User: Write a in details eye-catching prompt for a thumbnail on 'My Journey at Google as a software engineer' AI Assistant: Create a YouTube thumbnail with a modern and professional design. The background should feature a futuristic tech theme, with a sleek office workspace, soft blue lighting, and a subtle Google-inspired color palette (red, blue, yellow, green). Add a Google logo (small and non-intrusive) in a corner. Display the text 'My Journey at Google' in bold, white & blue gradient, and 'as a Software Engineer' in a clean, modern yellow font below. Use a stylish code-themed overlay with abstract programming syntax, giving a dynamic and high-tech look. The overall design should be minimalist yet engaging, with sharp contrast for readability. No living beings or watermarks—just pure, clean design with an inspiring tech aesthetic. Here is an example of a correct answer that is expected from you as an AI assistant: User: Write a in details eye-catching prompt for a thumbnail on 'wifi in village with a ultra light plane' AI Assistant: 'Create a YouTube thumbnail featuring a breathtaking rural landscape with lush green fields, small houses, and a clear blue sky. In the foreground, depict a sleek ultra-light plane soaring low, symbolizing connectivity. Add WiFi signal waves emitting from a modern communication tower near the village, visually representing internet access. Use bold, high-contrast text like 'Superfast WiFi in Villages!' in yellow & white, with a modern, tech-inspired font. Apply vibrant colors, subtle gradients, and a cinematic glow for an eye-catching effect. Ensure a clean, watermark-free, and high-quality finish, making it ideal for YouTube engagement.' Here is an example of a correct answer that is expected from you as an AI assistant: User: Write a in details eye-catching prompt for a thumbnail on 'visit to dubai' AI Assistant: 'Create a stunning YouTube thumbnail for a video titled 'Visit to Dubai.' The background should feature an aerial view of Dubai's skyline, showcasing the Burj Khalifa, modern skyscrapers, and desert landscape in golden sunset lighting. On the right side, place a luxury car (Lamborghini or Rolls-Royce) on Sheikh Zayed Road with motion blur for a dynamic effect. On the left, leave a placeholder for 'A Human' (silhouetted or blurred to allow user upload). Bold, eye-catching text should read 'Dubai Like Never Before!' in a gold and white gradient, placed in the upper part with a slight 3D effect. Add subtle travel icons (airplane, location pin) for extra appeal. Ensure high contrast, vibrant colors, and a cinematic feel while keeping it clean and professional.' Here is an example of a correct answer that is expected from you as an AI assistant: User: Write a in details eye-catching prompt for a thumbnail on 'truth behind poverty of south asia' AI Assistant: 'Design a thought-provoking and impactful YouTube thumbnail for a video titled 'Truth Behind Poverty of South Asia.' The background should feature a cinematic depiction of a bustling yet impoverished South Asian street, with vibrant yet worn-down market stalls, crowded streets, and a mix of traditional and modern elements. Use a warm, earthy color palette with golden hues and muted tones to evoke authenticity and depth. The title 'Truth Behind Poverty of South Asia' should be written in bold, vintage serif font with a distressed texture, positioned prominently at the top center in white and gold for contrast. Add a 3D rendering of a broken chain or a symbolic empty bowl as the focal element, placed dynamically in the foreground to represent struggle and resilience. Include subtle dramatic lighting effects to highlight key elements and create a compelling visual narrative. Ensure the design is clean, professional, and free of watermarks or haram/living elements, optimized for high engagement and click-through appeal.' Here is an example of a correct answer that is expected from you as an AI assistant: User: Write a in details eye-catching prompt for a thumbnail on 'the tsunami of the japan' AI Assistant: 'Create a dramatic and impactful YouTube thumbnail for a video titled 'The Tsunami of Japan.' The background should feature a cinematic depiction of a massive tsunami wave crashing into a coastal city, with towering skyscrapers partially submerged and debris swirling in the water. Use deep cinematic tones of blue and gray to evoke intensity and urgency. The title 'The Tsunami of Japan' should be written in bold, white, and red embossed metallic lettering, positioned at the top center for maximum visibility. Add a 3D rendering of a glowing warning sign or a wave icon as the focal element, placed prominently in the foreground to enhance visual storytelling. Include subtle motion blur effects on the wave and debris for a dynamic, high-energy feel. The color palette should combine dark, moody tones with vibrant red accents for contrast. Ensure the design is clean, professional, and free of watermarks or haram/living elements, optimized for high engagement and click-through appeal.' Here is an example of a correct answer that is expected from you as an AI assistant: User: Write a in details eye-catching prompt for a thumbnail on 'the industrial revolution' AI Assistant: 'Design a bold and impactful YouTube thumbnail for a video titled 'The Industrial Revolution.' The background should feature a dramatic cinematic scene of a 19th-century factory with towering smokestacks, steam engines, and workers in silhouette, set against a moody, sepia-toned sky. The title 'The Industrial Revolution' should be written in vintage serif font with a distressed metallic texture, positioned prominently at the top center for maximum visibility. Add a 3D rendering of a large, intricate gear wheel as the focal element, symbolizing innovation and machinery, placed dynamically in the foreground. The color palette combines deep sepia tones with metallic silver and bronze accents for a historical, industrial feel. A subtle placeholder text 'for a man' is placed in the bottom right corner, using minimalist white font for balance. This design is optimized for high engagement, blending historical significance and industrial aesthetics with a bold, professional look, free from watermarks and haram/living elements.' Here is an example of a correct answer that is expected from you as an AI assistant: User: Write a in details eye-catching prompt for a thumbnail on 'mistry behind bermuda triangle' AI Assistant: 'Design a mysterious and captivating YouTube thumbnail for a video titled 'Mystery Behind Bermuda Triangle.' The background should feature a cinematic underwater scene with swirling ocean currents, a glowing triangle, and a sunken ship silhouette, all bathed in deep, moody tones of navy blue and emerald green. The title 'Mystery Behind Bermuda Triangle' should be written in bold, futuristic neon text with a glowing cyan and purple gradient, positioned diagonally across the center for a dynamic effect. Add a 3D rendering of a dramatic vortex at the center, pulling in abstract geometric shapes and glowing particles to symbolize the triangle's enigmatic pull. The color palette combines deep cinematic tones with vibrant neon contrasts for a mysterious and engaging vibe. A subtle placeholder text 'for a man' is placed in the bottom right corner, using minimalist white font for balance. This design is optimized for high engagement, blending intrigue and mystery with a bold, professional aesthetic, free from watermarks and haram/living elements.' Here is an example of a correct answer that is expected from you as an AI assistant: User: Write a in details eye-catching prompt for a thumbnail on 'Best 5 open world games' AI Assistant: 'Create an immersive and captivating YouTube thumbnail for a video titled 'Best 5 Open World Games.' The background should feature a cinematic collage of iconic open-world game landscapes, including lush forests, futuristic cities, and vast deserts, blending seamlessly into a dramatic sunset sky. The title 'Best 5 Open World Games' should be written in bold, embossed metallic lettering with a gold and white gradient, positioned prominently at the top center for maximum impact. Add a 3D rendering of a glowing game controller surrounded by floating icons of popular open-world games (like a sword, car, and map), placed dynamically in the foreground to symbolize exploration and adventure. The color palette combines deep cinematic tones with vibrant neon accents for a modern, high-energy vibe. A subtle placeholder text 'for a man' is placed in the bottom right corner, using minimalist white font for balance. This design is optimized for high engagement, blending excitement and creativity with a bold, professional aesthetic, free from watermarks and haram/living elements. Create it so unique that you've never generated before."`;

    try {
        const cookieStore = await cookies();
        const access_token = cookieStore.get("sb-access-token")?.value;

        if (!access_token) {
            return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
        }

        const supabaseServer = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${access_token}` } } }
        );

        const { data: { user }, error: userError } = await supabaseServer.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "User not found or invalid session" }, { status: 401 });
        }
        const user_id = user.id;

        // Create service role client for credit operations
        const supabaseService = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Ensure user has a record in users_meta table
        try {
            const { data: userMeta, error: userMetaError } = await supabaseService
                .from("users_meta")
                .select("id, credits")
                .eq("id", user_id)
                .single();

            if (userMetaError || !userMeta) {
                console.log('Creating user meta record for user:', user_id);
                // Create user meta record if it doesn't exist
                const { error: createError } = await supabaseService
                    .from("users_meta")
                    .insert({
                        id: user_id,
                        credits: 0, // Start with 0 credits
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (createError) {
                    console.error('Error creating user meta record:', createError);
                    return NextResponse.json({ error: "Failed to initialize user account. Please try again." }, { status: 500 });
                }
            }
        } catch (error) {
            console.error('Error checking/creating user meta:', error);
            return NextResponse.json({ error: "Failed to initialize user account. Please try again." }, { status: 500 });
        }

        const payload = await req.json();
        const { prompt, is_public, text_position } = payload;

        if (!prompt?.trim()) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Check current credits before proceeding
        const { data: currentUserMeta, error: creditCheckError } = await supabaseService
            .from("users_meta")
            .select("credits")
            .eq("id", user_id)
            .single();

        if (creditCheckError) {
            console.error('Error checking current credits:', creditCheckError);
            return NextResponse.json({ error: "Failed to check credits. Please try again." }, { status: 500 });
        }

        if (!currentUserMeta || currentUserMeta.credits < 4) {
            return NextResponse.json({ 
                error: "Not enough credits! You need 4 credits to generate thumbnails. Please purchase more credits to continue.",
                currentCredits: currentUserMeta?.credits || 0,
                requiredCredits: 4
            }, { status: 402 });
        }

        const trimmedPrompt = prompt.trim().slice(0, 200);
        const validTextPosition = [
            "Auto",
            "Center",
            "Top Center",
            "Bottom Center",
            "Left Center",
            "Right Center",
            "Top Left",
            "Top Right",
            "Bottom Left",
            "Bottom Right",
            "No Text",
        ].includes(text_position || "")
            ? text_position
            : "center";
        const group_id = uuidv4();
        const MAX_RETRIES = 2;

        // Simple credit deduction - no complex function calls
        const { error: updateError } = await supabaseService
            .from("users_meta")
            .update({ credits: currentUserMeta.credits - 4 })
            .eq("id", user_id);

        if (updateError) {
            console.error('Error updating credits:', updateError);
            return NextResponse.json({ error: "Failed to process credits. Please try again." }, { status: 500 });
        }

        // Record credit usage in credit_history
        const { error: historyError } = await supabaseService
            .from("credit_history")
            .insert({
                user_id: user_id,
                credits_used: 4,
                credits_remaining: currentUserMeta.credits - 4,
                action: 'usage',
                created_at: new Date().toISOString()
            });

        if (historyError) {
            console.error('Error recording credit history:', historyError);
            // Don't fail the request if history recording fails
        }

        console.log('Credits deducted successfully. New balance:', currentUserMeta.credits - 4);

        const generateThumbnail = async (i: number): Promise<string | null> => {
            let retryCount = 0;
            let success = false;
            let image_url: string | null = null;
            while (retryCount < MAX_RETRIES && !success) {
                try {
                    // 1. Get prompt from DeepSeek
                    const deepseekResponse = await fetch(
                        "https://api.deepseek.com/chat/completions",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                            },
                            body: JSON.stringify({
                                model: "deepseek-chat",
                                messages: [
                                    { role: "system", content: SYSTEM_PROMPT },
                                    { role: "user", content: `MUST FOLLOW: User prompt is ${prompt} and text position selected by user was ${text_position}` }
                                ],
                                temperature: 0.7 + (i * 0.1),
                                max_tokens: 800,
                            }),
                        }
                    );
                    if (!deepseekResponse.ok) throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
                    const deepseekData = await deepseekResponse.json();
                    const aiPrompt = deepseekData.choices?.[0]?.message.content;
                    if (!aiPrompt) continue;
                    // 2. Generate image with Nebius
                    const fluxResponse = await fetch(
                        "https://api.studio.nebius.com/v1/images/generations",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${process.env.NEBIUS_API_KEY}`,
                            },
                            body: JSON.stringify({
                                model: "black-forest-labs/flux-dev",
                                prompt: aiPrompt,
                                negative_prompt: "human, person, people, face, hands, fingers, haram, living things, animals, black bar, watermark, youtube channel, youtuber logo, channel name, branding, text overlay, unwanted elements, irrelevant things, bars in top and bottom of image, 16:9 aspect ratio, 1280:780, extra body parts, distorted anatomy, low quality, blurry, pixelated, spelling mistake",
                                n: 1,
                                width: 1280,
                                height: 720
                            }),
                        }
                    );
                    if (!fluxResponse.ok) throw new Error(`Nebius API error: ${fluxResponse.status}`);
                    const fluxData = await fluxResponse.json();
                    image_url = fluxData.data?.[0]?.url;
                    if (!image_url) continue;
                    // 3. Insert into database
                    const { data: insertedThumbnail, error } = await supabaseService
                        .from("thumbnails")
                        .insert({
                            user_id,
                            prompt: aiPrompt,
                            image_url,
                            group_id,
                            text_position: validTextPosition,
                            is_public: is_public ?? true,
                            is_featured: false,
                            created_at: new Date().toISOString(),
                        })
                        .select()
                        .single();

                    if (error) console.log(error);

                    // Extract and save tags for the thumbnail
                    if (insertedThumbnail?.id) {
                        try {
                            const tagResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/extract-tags`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    prompt: aiPrompt,
                                    thumbnailId: insertedThumbnail.id
                                })
                            });

                            if (tagResponse.ok) {
                                const tagData = await tagResponse.json();
                                console.log('Tags extracted:', tagData.tags);
                            }
                        } catch (tagError) {
                            console.error('Error extracting tags:', tagError);
                            // Continue without tags if extraction fails
                        }
                    }

                    success = true;
                } catch (err) {
                    retryCount++;
                }
            }
            return image_url;
        };

        const results = await Promise.all([
            generateThumbnail(0),
            generateThumbnail(1),
            generateThumbnail(2),
            generateThumbnail(3),
        ]);

        const image_urls = results.filter(Boolean);
        // for debug I've closed my dynamic part and using static one
        // const image_urls = ['https://pictures-storage.storage.eu-north1.nebius.cloud/text2img-eb2c8acb-30ac-489a-bcc1-72bb1d78dc0b_00001_.webp', 'https://pictures-storage.storage.eu-north1.nebius.cloud/text2img-eb2c8acb-30ac-489a-bcc1-72bb1d78dc0b_00001_.webp', 'https://pictures-storage.storage.eu-north1.nebius.cloud/text2img-eb2c8acb-30ac-489a-bcc1-72bb1d78dc0b_00001_.webp','https://pictures-storage.storage.eu-north1.nebius.cloud/text2img-eb2c8acb-30ac-489a-bcc1-72bb1d78dc0b_00001_.webp'];

        if (image_urls.length === 0) {
            throw new Error("Failed to generate any thumbnails");
        }

        // Track user behavior for AI suggestions
        try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/track-user-behavior`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user_id,
                    action: 'generate_thumbnails',
                    data: { 
                        prompt: trimmedPrompt,
                        text_position: validTextPosition,
                        is_public: is_public ?? true,
                        group_id: group_id,
                        thumbnails_generated: image_urls.length,
                        credits_used: 4
                    }
                })
            });
        } catch (trackingError) {
            console.error('Error tracking user behavior:', trackingError);
            // Don't fail the request if tracking fails
        }

        return NextResponse.json({
            success: true,
            group_id,
            image_urls,
        });

    } catch (error) {
        console.error("Generate API error:", error);
        return NextResponse.json({ 
            error: "Failed to generate thumbnails. Please try again.",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
} 