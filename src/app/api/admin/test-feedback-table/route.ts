import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Create a new Supabase client with service role key to bypass RLS
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Test 1: Check if feedback table exists
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Table check error:', tableError);
      return NextResponse.json({
        error: 'Feedback table check failed',
        details: tableError.message,
        code: tableError.code
      }, { status: 500 });
    }

    // Test 2: Get table structure
    const { data: columns, error: columnsError } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'feedback' });

    if (columnsError) {
      console.error('Columns check error:', columnsError);
      // Try alternative method
      const { data: sampleData, error: sampleError } = await supabaseAdmin
        .from('feedback')
        .select('*')
        .limit(1);

      return NextResponse.json({
        tableExists: true,
        sampleData: sampleData,
        error: sampleError?.message || 'No error',
        note: 'Could not get column info, but table exists'
      });
    }

    return NextResponse.json({
      tableExists: true,
      columns: columns,
      message: 'Feedback table is accessible'
    });

  } catch (error) {
    console.error('Error in test feedback table API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 