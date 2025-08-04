import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, field, value } = body;

    console.log('Test update request:', { id, field, value });

    if (!id || !field || value === undefined) {
      return NextResponse.json(
        { error: 'ID, field, and value are required' },
        { status: 400 }
      );
    }

    // Create a new Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Validate the thumbnail exists first
    const { data: existingThumbnail, error: fetchError } = await supabaseAdmin
      .from('thumbnails')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingThumbnail) {
      console.error('Error fetching thumbnail or thumbnail not found:', fetchError);
      return NextResponse.json(
        { error: 'Thumbnail not found' },
        { status: 404 }
      );
    }

    console.log('Existing thumbnail:', existingThumbnail);

    // Try to update with just one field
    const updateData = { [field]: value };
    console.log('Update data:', updateData);

    const { data, error } = await supabaseAdmin
      .from('thumbnails')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating thumbnail:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to update thumbnail', details: error.message },
        { status: 500 }
      );
    }

    console.log('Thumbnail updated successfully:', data);

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Thumbnail updated successfully'
    });
  } catch (error) {
    console.error('Error in test update API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 