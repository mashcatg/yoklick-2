import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Create a new Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get a sample thumbnail to see the structure
    const { data: sampleThumbnail, error: fetchError } = await supabaseAdmin
      .from('thumbnails')
      .select('*')
      .limit(1)
      .single();

    if (fetchError) {
      console.error('Error fetching sample thumbnail:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch sample thumbnail', details: fetchError.message },
        { status: 500 }
      );
    }

    // Get the table structure by examining the sample data
    const tableStructure = {
      fields: Object.keys(sampleThumbnail || {}),
      sampleData: sampleThumbnail
    };

    console.log('Thumbnails table structure:', tableStructure);

    return NextResponse.json({ 
      success: true,
      tableStructure,
      message: 'Table structure retrieved successfully'
    });
  } catch (error) {
    console.error('Error in test schema API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 