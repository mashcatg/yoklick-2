import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // all, public, private, featured
    const test = searchParams.get('test'); // Add test parameter

    // Create a new Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If test parameter is provided, return table structure
    if (test === 'schema') {
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

      const tableStructure = {
        fields: Object.keys(sampleThumbnail || {}),
        sampleData: sampleThumbnail
      };

      return NextResponse.json({ 
        success: true,
        tableStructure,
        message: 'Table structure retrieved successfully'
      });
    }

    let query = supabaseAdmin
      .from('thumbnails')
      .select('*, user:users_meta(id, name, avatar_url)')
      .order('created_at', { ascending: false });

    // Apply filters based on type
    if (type === 'public') {
      query = query.eq('is_public', true);
    } else if (type === 'private') {
      query = query.eq('is_public', false);
    } else if (type === 'featured') {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching thumbnails:', error);
      return NextResponse.json(
        { error: 'Failed to fetch thumbnails' },
        { status: 500 }
      );
    }

    return NextResponse.json({ thumbnails: data || [] });
  } catch (error) {
    console.error('Error in admin thumbnails API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    console.log('PATCH request received:', { id, updates });

    if (!id || !updates) {
      return NextResponse.json(
        { error: 'ID and updates are required' },
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

    console.log('Existing thumbnail data:', existingThumbnail);

    // Filter updates to only include valid fields that exist in the thumbnails table
    const validFields = [
      'is_public',
      'is_featured', 
      'is_hidden',
      'prompt',
      'image_url',
      'text_position',
      'group_id',
      'user_id'
    ];

    const filteredUpdates: any = {};
    Object.keys(updates).forEach(key => {
      if (validFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      } else {
        console.warn(`Skipping invalid field: ${key}`);
      }
    });

    console.log('Filtered updates:', filteredUpdates);

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    console.log('Updating thumbnail:', { id, currentData: existingThumbnail, filteredUpdates });

    // Update the thumbnail with only valid fields
    const { data, error } = await supabaseAdmin
      .from('thumbnails')
      .update(filteredUpdates)
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
    console.error('Error in admin thumbnails update API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
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

    const { error } = await supabaseAdmin
      .from('thumbnails')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting thumbnail:', error);
      return NextResponse.json(
        { error: 'Failed to delete thumbnail', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Thumbnail deleted successfully'
    });
  } catch (error) {
    console.error('Error in admin thumbnails delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 