import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

export async function GET() {
  try {
    // Check if we can list buckets (requires service role)
    if (supabaseServiceKey) {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        return NextResponse.json({ 
          error: 'Cannot list buckets',
          message: listError.message,
          hasServiceKey: true
        }, { status: 500 });
      }
      
      const profileImagesBucket = buckets?.find(bucket => bucket.name === 'profile-images');
      
      return NextResponse.json({
        buckets: buckets?.map(b => ({ name: b.name, public: b.public })),
        profileImagesBucket: profileImagesBucket ? {
          name: profileImagesBucket.name,
          public: profileImagesBucket.public,
          createdAt: profileImagesBucket.created_at
        } : null,
        hasServiceKey: true
      });
    } else {
      // Without service key, try to access the bucket directly
      try {
        const { data, error } = await supabase.storage
          .from('profile-images')
          .list('', { limit: 1 });
          
        if (error) {
          return NextResponse.json({
            error: 'Cannot access profile-images bucket',
            message: error.message,
            hasServiceKey: false
          }, { status: 500 });
        }
        
        return NextResponse.json({
          message: 'profile-images bucket is accessible',
          hasServiceKey: false
        });
        
      } catch (accessError) {
        return NextResponse.json({
          error: 'Cannot access profile-images bucket',
          message: accessError instanceof Error ? accessError.message : 'Unknown error',
          hasServiceKey: false
        }, { status: 500 });
      }
    }
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Storage check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 