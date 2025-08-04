import { supabase } from './supabaseClient';

// Rate limiting for auth operations
const authRateLimit = new Map<string, { count: number; resetTime: number }>();

// Utility function to check auth rate limit
export const checkAuthRateLimit = (operation: string, userId?: string): boolean => {
  const now = Date.now();
  const key = `${operation}:${userId || 'anonymous'}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5;
  
  let entry = authRateLimit.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    authRateLimit.set(key, entry);
  }
  
  if (entry.count >= maxRequests) {
    return false; // Rate limited
  }
  
  entry.count++;
  authRateLimit.set(key, entry);
  return true; // Allowed
};

// Utility function to parse hash fragments
export const parseHashFragment = () => {
  if (typeof window === 'undefined') return {};
  
  const hash = window.location.hash.substring(1); // Remove the #
  const params = new URLSearchParams(hash);
  
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
    error: params.get('error'),
    error_description: params.get('error_description')
  };
};

// Utility function to clear hash fragment
export const clearHashFragment = () => {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
};

// Utility function to parse query parameters
export const parseQueryParams = () => {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
    error: params.get('error'),
    error_description: params.get('error_description')
  };
};

// Enhanced authentication handler
export const handleAuthentication = async () => {
  try {

    
    // First, check for hash fragment tokens (email confirmation flow)
    const hashParams = parseHashFragment();

    
    if (hashParams.access_token && hashParams.refresh_token) {

      
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: hashParams.access_token,
          refresh_token: hashParams.refresh_token
        });
        
        if (data.user && !error) {

          
          // Store user data
          localStorage.setItem('yoklick_user_id', data.user.id);
          localStorage.setItem('yoklick_user_email', data.user.email || '');
          
          // Clear the hash fragment
          clearHashFragment();
          
          // Wait a moment for session to be fully established
          await new Promise(resolve => setTimeout(resolve, 500));
          
          return { user: data.user, success: true };
        } else {
          console.error('❌ Error setting session from hash tokens:', error);
        }
      } catch (setSessionError) {
        console.error('❌ Exception setting session from hash tokens:', setSessionError);
      }
    }
    
    // Check for query parameter tokens (alternative flow)
    const queryParams = parseQueryParams();

    
    if (queryParams.access_token && queryParams.refresh_token) {

      
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: queryParams.access_token,
          refresh_token: queryParams.refresh_token
        });
        
        if (data.user && !error) {

          
          // Store user data
          localStorage.setItem('yoklick_user_id', data.user.id);
          localStorage.setItem('yoklick_user_email', data.user.email || '');
          
          // Wait a moment for session to be fully established
          await new Promise(resolve => setTimeout(resolve, 500));
          
          return { user: data.user, success: true };
        } else {
          console.error('❌ Error setting session from query tokens:', error);
        }
      } catch (setSessionError) {
        console.error('❌ Exception setting session from query tokens:', setSessionError);
      }
    }
    
    // Check current authentication status
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {

      localStorage.setItem('yoklick_user_id', user.id);
      localStorage.setItem('yoklick_user_email', user.email || '');
      return { user, success: true };
    }
    
    // Check session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      localStorage.setItem('yoklick_user_id', session.user.id);
      localStorage.setItem('yoklick_user_email', session.user.email || '');
      return { user: session.user, success: true };
    }

    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshData.user && !refreshError) {

        localStorage.setItem('yoklick_user_id', refreshData.user.id);
        localStorage.setItem('yoklick_user_email', refreshData.user.email || '');
        return { user: refreshData.user, success: true };
      } else {
        console.log('❌ Session refresh failed:', refreshError);
      }
    } catch (refreshError) {
      console.error('❌ Exception during session refresh:', refreshError);
    }
    
    // Check stored user data as last resort
    const storedUserId = localStorage.getItem('yoklick_user_id');
    const storedUserEmail = localStorage.getItem('yoklick_user_email');
    
    if (storedUserId && storedUserEmail) {
      // Try one more session refresh
      try {
        await supabase.auth.refreshSession();
        const { data: { user: finalUser } } = await supabase.auth.getUser();
        if (finalUser) {
          return { user: finalUser, success: true };
        }
      } catch (finalError) {
        console.error('❌ Final session recovery failed:', finalError);
      }
    }
    

    return { user: null, success: false };
    
  } catch (error) {
    return { user: null, success: false };
  }
};

// Function to store user data before redirect
export const storeUserDataForRedirect = (userId: string, userEmail: string) => {
  localStorage.setItem('yoklick_user_id', userId);
  localStorage.setItem('yoklick_user_email', userEmail);
};

// Function to clear stored user data
export const clearStoredUserData = () => {
  localStorage.removeItem('yoklick_user_id');
  localStorage.removeItem('yoklick_user_email');
}; 