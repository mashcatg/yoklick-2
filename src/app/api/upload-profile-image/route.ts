import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Use service role key if available, otherwise use anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    console.log('Uploading to profile-images bucket:', fileName);

    // Try to upload directly to the bucket
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      
      // If bucket doesn't exist and we have service role key, try to create it
      if (error.message.includes('bucket') && supabaseServiceKey) {
        try {
          console.log('Attempting to create profile-images bucket...');
          const { error: createError } = await supabase.storage.createBucket('profile-images', {
            public: true,
            allowedMimeTypes: ['image/*'],
            fileSizeLimit: 5242880 // 5MB
          });
          
          if (createError) {
            console.error('Error creating bucket:', createError);
            return NextResponse.json({ 
              error: 'Storage bucket not available. Please contact support.' 
            }, { status: 500 });
          }
          
          // Try upload again
          const { data: retryData, error: retryError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, buffer, {
              contentType: file.type,
              cacheControl: '3600',
              upsert: false
            });
            
          if (retryError) {
            console.error('Retry upload error:', retryError);
            return NextResponse.json({ error: retryError.message }, { status: 500 });
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName);

          console.log('Upload successful after bucket creation:', publicUrl);
          return NextResponse.json({ 
            success: true, 
            publicUrl,
            fileName 
          });
          
        } catch (createBucketError) {
          console.error('Error creating bucket:', createBucketError);
          return NextResponse.json({ 
            error: 'Storage bucket not available. Please contact support.' 
          }, { status: 500 });
        }
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    return NextResponse.json({ 
      success: true, 
      publicUrl,
      fileName 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 