import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get tracking parameters from query string
    const { searchParams } = new URL(request.url);
    const row = searchParams.get('r');
    const type = searchParams.get('t');
    const timestamp = new Date().toISOString();

    // Log the email open event
    console.log('📧 Email opened:', {
      row,
      type,
      timestamp
    });

    // Call automation server if configured
    const automationServerUrl = process.env.NEXT_PUBLIC_AUTOMATION_SERVER_TRACK_NEW_USER;
    if (automationServerUrl) {
      try {
        // Build URL with only existing parameters
        const params = new URLSearchParams();
        if (row) params.append('row', row);
        if (type) params.append('type', type);
        
        const trackingUrl = `${automationServerUrl}?${params.toString()}`;
        
        await fetch(trackingUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('✅ Email tracking sent to automation server');
      } catch (error) {
        console.error('❌ Failed to send email tracking to automation server:', error);
      }
    }

    // Serve the yoklick.png image directly
    const imagePath = '/yoklick.png';
    
    // Read the image file from the public directory
    const fs = require('fs');
    const path = require('path');
    
    try {
      const imageBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'yoklick.png'));
      
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (imageError) {
      console.error('❌ Error reading yoklick.png:', imageError);
      
      // Fallback: redirect to the image
      return NextResponse.redirect(new URL(imagePath, request.url), 302);
    }
  } catch (error) {
    console.error('❌ Error tracking email open:', error);
    
    // Fallback: redirect to the image
    const imagePath = '/yoklick.png';
    return NextResponse.redirect(new URL(imagePath, request.url), 302);
  }
} 